from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import os
import math
import uuid
import re
import hashlib
import secrets
import smtplib
from email.message import EmailMessage
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip'}
DEFAULT_SECTION = 'AI-B'
ATTENDANCE_STATUSES = ['Present', 'Absent', 'No Attendance']
COUNTED_ATTENDANCE_STATUSES = ['Present', 'Absent']
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
RESET_TOKEN_MINUTES = 30
os.makedirs(UPLOAD_DIR, exist_ok=True)

VALID_USNS = ['1DS25AI016', '1DS25AI017', '1DS25AI018', '1DS25CD016', '1DS25CD017', '1DS25CD018']

def load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame()

def save_csv(df, filename):
    path = os.path.join(DATA_DIR, filename)
    df.to_csv(path, index=False)

def ensure_columns(df, columns):
    for column, default in columns.items():
        if column not in df.columns:
            df[column] = default
    return df

def hash_password(password):
    return hashlib.sha256(str(password).encode('utf-8')).hexdigest()

def verify_password(stored_password, provided_password):
    stored = str(stored_password)
    provided = str(provided_password)
    return stored == provided or stored == hash_password(provided)

def load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if not os.path.exists(env_path):
        return
    with open(env_path, 'r', encoding='utf-8') as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

load_env_file()

def valid_email(email):
    return not email or bool(EMAIL_RE.match(str(email)))

def email_exists(email, ignore=None):
    if not email:
        return False
    ignore = ignore or {}
    checks = [
        ('students.csv', 'usn'),
        ('teachers.csv', 'teacher_id'),
        ('admins.csv', 'admin_id')
    ]
    for filename, id_field in checks:
        df = load_csv(filename)
        if df.empty or 'email' not in df.columns:
            continue
        matches = df[df['email'].fillna('').astype(str).str.lower() == str(email).lower()]
        if id_field in ignore:
            matches = matches[matches[id_field].astype(str) != str(ignore[id_field])]
        if not matches.empty:
            return True
    return False

def next_id(df):
    if df.empty or 'id' not in df.columns:
        return 1
    return int(pd.to_numeric(df['id'], errors='coerce').fillna(0).max()) + 1

def is_true(value):
    return str(value).lower() == 'true'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_upload(file, folder):
    if not file or file.filename == '':
        return '', ''
    if not allowed_file(file.filename):
        return None, None

    target_dir = os.path.join(UPLOAD_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)
    original_name = secure_filename(file.filename)
    stored_name = f"{uuid.uuid4().hex}_{original_name}"
    file.save(os.path.join(target_dir, stored_name))
    return f"{folder}/{stored_name}", original_name

def prepare_assignments(df):
    df = ensure_columns(df, {
        'description': '',
        'assignment_group_id': '',
        'creator': '',
        'teacher_id': '',
        'section': DEFAULT_SECTION,
        'file_path': '',
        'file_name': '',
        'submitted_at': '',
        'submission_file_path': '',
        'submission_file_name': ''
    })
    for column in ['description', 'assignment_group_id', 'creator', 'teacher_id', 'section', 'file_path', 'file_name', 'submitted_at', 'submission_file_path', 'submission_file_name']:
        df[column] = df[column].fillna('').astype(object)
    df['section'] = df['section'].replace('', DEFAULT_SECTION)
    return df

def prepare_notifications(df):
    df = ensure_columns(df, {
        'usn': '',
        'sender': '',
        'teacher_username': '',
        'teacher_id': '',
        'section': '',
        'recipient_type': 'student'
    })
    for column in ['usn', 'sender', 'teacher_username', 'teacher_id', 'section', 'recipient_type']:
        df[column] = df[column].fillna('').astype(object)
    return df

def prepare_password_reset_requests(df):
    df = ensure_columns(df, {
        'id': '',
        'role': '',
        'email': '',
        'identifier': '',
        'name': '',
        'status': 'pending',
        'requested_at': '',
        'resolved_at': '',
        'resolved_by': '',
        'token_hash': '',
        'expires_at': '',
        'email_sent': False,
        'reset_url': ''
    })
    for column in ['role', 'email', 'identifier', 'name', 'status', 'requested_at', 'resolved_at', 'resolved_by', 'token_hash', 'expires_at', 'reset_url']:
        df[column] = df[column].fillna('').astype(str)
    df['email_sent'] = df['email_sent'].fillna(False).astype(object)
    return df

def frontend_base_url():
    return os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3000').rstrip('/')

def send_reset_email(to_email, name, reset_url):
    host = os.environ.get('SMTP_SERVER', '').strip()
    if not host:
        return False, 'SMTP is not configured.'
    port = int(os.environ.get('SMTP_PORT', '587'))
    username = os.environ.get('SMTP_EMAIL', '').strip()
    password = os.environ.get('SMTP_PASSWORD', '')
    sender = os.environ.get('SMTP_FROM', username or 'noreply@predicted.local')

    message = EmailMessage()
    message['Subject'] = 'PredictED Password Reset Request'
    message['From'] = sender
    message['To'] = to_email
    message.set_content(
        "Hello,\n\n"
        "A password reset request was received for your PredictED account.\n\n"
        "Click the link below to reset your password:\n\n"
        f"{reset_url}\n\n"
        "This link expires in 30 minutes.\n\n"
        "If you did not request this reset, please ignore this email.\n"
    )

    with smtplib.SMTP(host, port, timeout=15) as server:
        server.starttls()
        if username:
            server.login(username, password)
        server.send_message(message)
    return True, 'Password reset link sent to registered email.'

def unique_notifications(df):
    if df.empty:
        return df
    return df.drop_duplicates(
        subset=['title', 'message', 'type', 'date', 'sender', 'teacher_username', 'teacher_id', 'section', 'recipient_type'],
        keep='first'
    )

def prepare_students(df):
    df = ensure_columns(df, {'section': DEFAULT_SECTION, 'password': 'student123', 'email': ''})
    df['section'] = df['section'].fillna(DEFAULT_SECTION).replace('', DEFAULT_SECTION)
    df['password'] = df['password'].fillna('student123').replace('', 'student123').astype(str)
    df['email'] = df['email'].fillna('').astype(str)
    return df

def public_student_records(df):
    public_df = df.drop(columns=['password'], errors='ignore').copy()
    return public_df.fillna('').to_dict('records')

def prepare_attendance(df):
    df = ensure_columns(df, {'section': DEFAULT_SECTION})
    df['section'] = df['section'].fillna('').astype(object)
    try:
        students = prepare_students(load_csv('students.csv'))
        section_by_usn = students.set_index('usn')['section'].to_dict()
        mapped_sections = df['usn'].map(section_by_usn)
        df['section'] = mapped_sections.fillna(df['section']).replace('', DEFAULT_SECTION)
    except Exception:
        df['section'] = df['section'].replace('', DEFAULT_SECTION)
    return df

def prepare_timetable(df):
    if df.empty:
        return pd.DataFrame(columns=['section', 'day', 'start_time', 'end_time', 'subject', 'subject_code', 'teacher', 'teacher_id', 'room'])

    df = df.copy()
    if 'time_slot' in df.columns and ('start_time' not in df.columns or 'end_time' not in df.columns):
        times = df['time_slot'].astype(str).str.split('-', n=1, expand=True)
        df['start_time'] = times[0]
        df['end_time'] = times[1] if times.shape[1] > 1 else ''
    if 'subject_code' in df.columns and 'subject' not in df.columns:
        df['subject'] = df['subject_code']
    if 'faculty' in df.columns and 'teacher' not in df.columns:
        df['teacher'] = df['faculty']
    df = ensure_columns(df, {
        'section': DEFAULT_SECTION,
        'start_time': '',
        'end_time': '',
        'subject': '',
        'subject_code': '',
        'teacher': '',
        'teacher_id': '',
        'room': ''
    })
    df['section'] = df['section'].fillna(DEFAULT_SECTION).replace('', DEFAULT_SECTION)
    df['time_slot'] = df['start_time'].astype(str) + '-' + df['end_time'].astype(str)
    return df

def load_teachers():
    teachers = load_csv('teachers.csv')
    if teachers.empty:
        teachers = pd.DataFrame([
            {'teacher_id': 'T001', 'username': 'sandra', 'password': 'sandra123', 'name': 'Sandra Jestine', 'email': 'sandra@predicted.local'}
        ])
    teachers = ensure_columns(teachers, {
        'teacher_id': '',
        'username': '',
        'password': '',
        'name': '',
        'email': ''
    })
    teachers['email'] = teachers['email'].fillna('').astype(str)
    return teachers

def load_teacher_assignments():
    assignments = load_csv('teacher_assignments.csv')
    if assignments.empty:
        teachers = load_csv('teachers.csv')
        rows = []
        for _, teacher in teachers.iterrows():
            if 'section' in teacher and 'subject_code' in teacher:
                rows.append({
                    'teacher_id': teacher.get('teacher_id', ''),
                    'section': teacher.get('section', DEFAULT_SECTION),
                    'subject': teacher.get('subject', ''),
                    'subject_code': teacher.get('subject_code', '')
                })
        assignments = pd.DataFrame(rows, columns=['teacher_id', 'section', 'subject', 'subject_code'])
        if not assignments.empty:
            save_csv(assignments, 'teacher_assignments.csv')
    assignments = ensure_columns(assignments, {
        'teacher_id': '',
        'section': DEFAULT_SECTION,
        'subject': '',
        'subject_code': ''
    })
    for column in ['teacher_id', 'section', 'subject', 'subject_code']:
        assignments[column] = assignments[column].fillna('').astype(str)
    assignments['section'] = assignments['section'].replace('', DEFAULT_SECTION)
    return assignments

def assignments_for_teacher(teacher):
    assignments = load_teacher_assignments()
    return assignments[assignments['teacher_id'].astype(str) == str(teacher.get('teacher_id', ''))].copy()

def section_assignments_for_teacher(teacher):
    assignments = assignments_for_teacher(teacher)
    if assignments.empty:
        return assignments
    section = selected_section() or assignments.iloc[0]['section']
    return assignments[assignments['section'] == section].copy()

def selected_section():
    data = request.get_json(silent=True) or {}
    return (
        data.get('section') or
        data.get('selected_section') or
        request.form.get('section') or
        request.form.get('selected_section') or
        request.args.get('section') or
        request.args.get('selected_section') or
        ''
    )

def load_admins():
    admins = load_csv('admins.csv')
    if admins.empty:
        admins = pd.DataFrame([{
            'admin_id': 'A001',
            'name': 'PredictED Admin',
            'email': 'admin@predicted.local',
            'password_hash': hash_password('admin123')
        }])
        save_csv(admins, 'admins.csv')
    admins = ensure_columns(admins, {
        'admin_id': '',
        'name': '',
        'email': '',
        'password_hash': ''
    })
    for column in ['admin_id', 'name', 'email', 'password_hash']:
        admins[column] = admins[column].fillna('').astype(str)
    return admins

def get_admin_identity():
    data = request.get_json(silent=True) or {}
    admin_id = (
        data.get('admin_id') or
        request.args.get('admin_id') or
        request.form.get('admin_id') or
        ''
    )
    admins = load_admins()
    match = admins[admins['admin_id'].astype(str) == str(admin_id)]
    if match.empty:
        return None
    return match.iloc[0].to_dict()

def require_admin():
    admin = get_admin_identity()
    if not admin:
        return None, (jsonify({'success': False, 'message': 'Valid admin identity is required'}), 403)
    return admin, None

def require_admin_password(admin):
    data = request.get_json(silent=True) or {}
    password = str(data.get('admin_password') or request.args.get('admin_password') or '')
    if not password or admin.get('password_hash') != hash_password(password):
        return jsonify({'success': False, 'message': 'Admin password confirmation is required'}), 403
    return None

def prepare_marks(df):
    df = ensure_columns(df, {
        'student_id': '',
        'student_name': '',
        'section': DEFAULT_SECTION,
        'subject': '',
        'teacher_id': '',
        'CIE1': '',
        'CIE2': '',
        'CIE3': '',
        'SEE': ''
    })
    for column in ['student_id', 'student_name', 'section', 'subject', 'teacher_id']:
        df[column] = df[column].fillna('').astype(str)
    for column in ['CIE1', 'CIE2', 'CIE3', 'SEE']:
        df[column] = pd.to_numeric(df[column], errors='coerce')
    return df

def marks_records(df):
    result = df.copy()
    result['subject_average'] = result[['CIE1', 'CIE2', 'CIE3', 'SEE']].mean(axis=1, skipna=True).round(1)
    return result.fillna('').to_dict('records')

def get_teacher_identity():
    data = request.get_json(silent=True) or {}
    username = (
        data.get('teacher_username') or
        request.form.get('teacher_username') or
        request.args.get('teacher_username') or
        ''
    ).lower()
    teachers = load_teachers()
    match = teachers[teachers['username'].str.lower() == username]
    if match.empty:
        return None, None
    return username, match.iloc[0].to_dict()

def require_teacher():
    username, teacher = get_teacher_identity()
    if not teacher:
        return None, None, (jsonify({'success': False, 'message': 'Valid teacher identity is required'}), 403)
    assignments = assignments_for_teacher(teacher)
    if not assignments.empty:
        section = selected_section() or assignments.iloc[0]['section']
        subject_code = (request.args.get('subject_code') or (request.get_json(silent=True) or {}).get('subject_code') or request.form.get('subject_code') or '')
        candidates = assignments[assignments['section'] == section]
        if subject_code:
            candidates = candidates[candidates['subject_code'] == subject_code]
        if candidates.empty:
            return None, None, (jsonify({'success': False, 'message': 'Teacher is not assigned to this section/subject'}), 403)
        teacher.update(candidates.iloc[0].to_dict())
    return username, teacher, None

def require_teacher_assignment():
    username, teacher, error_response = require_teacher()
    if error_response:
        return None, None, None, error_response
    assignments = assignments_for_teacher(teacher)
    if assignments.empty:
        return None, None, None, (jsonify({'success': False, 'message': 'No section assignments found for this teacher'}), 403)
    section = selected_section() or assignments.iloc[0]['section']
    section_assignments = assignments[assignments['section'] == section]
    if section_assignments.empty:
        return None, None, None, (jsonify({'success': False, 'message': 'Teacher is not assigned to this section'}), 403)
    assignment = section_assignments.iloc[0].to_dict()
    return username, teacher, assignment, None

def teacher_subject(teacher):
    subjects = load_csv('subjects.csv')
    if subjects.empty:
        return None
    subject_code = teacher.get('subject_code')
    if not subject_code:
        teacher_assignments = assignments_for_teacher(teacher)
        subject_code = teacher_assignments.iloc[0]['subject_code'] if not teacher_assignments.empty else ''
    subject = subjects[subjects['code'] == subject_code]
    if subject.empty:
        subject = subjects[subjects['name'] == teacher.get('subject')]
    if subject.empty:
        return None
    return subject.iloc[0].to_dict()

def teacher_subject_id(teacher):
    subject = teacher_subject(teacher)
    return int(subject['id']) if subject else None

def teacher_allowed_subjects(teacher):
    subjects = load_csv('subjects.csv')
    assignments = section_assignments_for_teacher(teacher)
    if assignments.empty or subjects.empty:
        subject = teacher_subject(teacher)
        return [subject] if subject else []
    codes = assignments['subject_code'].astype(str).tolist()
    rows = subjects[subjects['code'].astype(str).isin(codes)].copy()
    return rows.fillna('').to_dict('records')

def teacher_allowed_subject_ids(teacher):
    return {int(subject['id']) for subject in teacher_allowed_subjects(teacher) if str(subject.get('id', '')).isdigit()}

def attendance_counts(df):
    if df.empty:
        return 0, 0, 0
    counted = df[df['status'].isin(COUNTED_ATTENDANCE_STATUSES)]
    total = len(counted)
    attended = len(counted[counted['status'] == 'Present'])
    missed = len(counted[counted['status'] == 'Absent'])
    return total, attended, missed

def attendance_percentage(df):
    total, attended, _ = attendance_counts(df)
    return round((attended / total * 100) if total else 0, 1)

def attendance_daily_trend(df):
    if df.empty:
        return []
    trend_df = df[df['status'].isin(COUNTED_ATTENDANCE_STATUSES)].copy()
    if trend_df.empty:
        return []
    trend_df['date'] = pd.to_datetime(trend_df['date'])
    daily = trend_df.groupby('date')['status'].apply(lambda x: (x == 'Present').sum() / len(x) * 100).reset_index()
    daily.columns = ['date', 'percentage']
    daily['date'] = daily['date'].dt.strftime('%Y-%m-%d')
    return daily.sort_values('date').to_dict('records')

def get_subject(subject_id):
    subjects = load_csv('subjects.csv')
    if subjects.empty:
        return None

    try:
        subject_id = int(subject_id)
    except (TypeError, ValueError):
        return None

    subject = subjects[subjects['id'] == subject_id]
    if subject.empty:
        return None
    return subject.iloc[0].to_dict()

def attendance_history_records(attendance):
    if attendance.empty:
        return []
    subjects = load_csv('subjects.csv')
    rows = attendance.copy()
    if not subjects.empty:
        subject_cols = subjects[['id', 'code', 'name', 'faculty']].rename(columns={
            'id': 'subject_lookup_id',
            'code': 'subject_code',
            'name': 'subject',
            'faculty': 'faculty'
        })
        rows = rows.merge(subject_cols, left_on='subject_id', right_on='subject_lookup_id', how='left')
    rows = rows.sort_values('date', ascending=False)
    return rows.drop(columns=['subject_lookup_id'], errors='ignore').fillna('').to_dict('records')

def save_attendance_record(usn, subject_id, status, date):
    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'] == usn]
    if student.empty:
        return None, 'Student not found'

    subject = get_subject(subject_id)
    if not subject:
        return None, 'Subject not found'

    if status not in ATTENDANCE_STATUSES:
        return None, 'Status must be Present, Absent, or No Attendance'

    try:
        attendance_date = datetime.strptime(date, '%Y-%m-%d').strftime('%Y-%m-%d')
    except (TypeError, ValueError):
        return None, 'Date must use YYYY-MM-DD format'

    attendance = prepare_attendance(load_csv('attendance.csv'))
    attendance = prepare_attendance(attendance)
    normalized_subject_id = int(subject_id)
    section = student.iloc[0]['section']

    if attendance.empty:
        attendance = pd.DataFrame(columns=['usn', 'subject_id', 'date', 'status', 'section'])

    attendance['subject_id'] = attendance['subject_id'].astype(int)
    existing = (
        (attendance['usn'] == usn) &
        (attendance['subject_id'] == normalized_subject_id) &
        (attendance['date'] == attendance_date) &
        (attendance['section'] == section)
    )

    if existing.any():
        attendance.loc[existing, 'status'] = status
        action = 'updated'
    else:
        new_row = pd.DataFrame([{
            'usn': usn,
            'subject_id': normalized_subject_id,
            'date': attendance_date,
            'status': status,
            'section': section
        }])
        attendance = pd.concat([attendance, new_row], ignore_index=True)
        action = 'created'

    save_csv(attendance, 'attendance.csv')

    return {
        'usn': usn,
        'subject_id': normalized_subject_id,
        'subject': subject['name'],
        'section': section,
        'date': attendance_date,
        'status': status,
        'action': action
    }, None

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    usn = data.get('usn', '').upper()
    password = str(data.get('password', ''))

    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'].astype(str).str.upper() == usn]
    if not student.empty:
        if not verify_password(student.iloc[0]['password'], password):
            return jsonify({'success': False, 'message': 'Invalid password'})
        return jsonify({
            'success': True,
            'usn': usn,
            'name': student.iloc[0]['name'],
            'section': student.iloc[0]['section']
        })

    if usn in VALID_USNS:
        return jsonify({'success': True, 'usn': usn, 'name': 'Student', 'section': DEFAULT_SECTION})
    return jsonify({'success': False, 'message': 'Invalid USN'})

@app.route('/api/change-password', methods=['POST'])
def change_student_password():
    data = request.json or {}
    usn = data.get('usn', '').upper()
    current_password = str(data.get('current_password', ''))
    new_password = str(data.get('new_password', ''))

    if len(new_password) < 4:
        return jsonify({'success': False, 'message': 'New password must be at least 4 characters'}), 400

    students = prepare_students(load_csv('students.csv'))
    idx = students[students['usn'].astype(str).str.upper() == usn].index
    if len(idx) == 0:
        return jsonify({'success': False, 'message': 'Student not found'}), 404
    if not verify_password(students.loc[idx[0], 'password'], current_password):
        return jsonify({'success': False, 'message': 'Current password is incorrect'}), 403

    students.loc[idx[0], 'password'] = hash_password(new_password)
    save_csv(students, 'students.csv')
    return jsonify({'success': True, 'message': 'Password updated successfully'})

@app.route('/api/teacher-login', methods=['POST'])
def teacher_login():
    data = request.json

    username = data.get('username', '').lower()
    password = data.get('password', '')

    teachers = load_teachers()
    teacher_row = teachers[teachers['username'].str.lower() == username]

    if not teacher_row.empty and verify_password(teacher_row.iloc[0]['password'], password):
        teacher = teacher_row.iloc[0].to_dict()
        teacher_assignments = assignments_for_teacher(teacher)
        assignments_payload = teacher_assignments.fillna('').to_dict('records')
        first_assignment = teacher_assignments.iloc[0].to_dict() if not teacher_assignments.empty else {}
        subject = teacher_subject({**teacher, **first_assignment})
        return jsonify({
            'success': True,
            'username': username,
            'teacher_id': teacher['teacher_id'],
            'name': teacher['name'],
            'subject_id': int(subject['id']) if subject else None,
            'subject': subject['name'] if subject else first_assignment.get('subject', ''),
            'subject_code': subject['code'] if subject else first_assignment.get('subject_code', ''),
            'section': first_assignment.get('section', ''),
            'assignments': assignments_payload,
            'sections': sorted(teacher_assignments['section'].unique().tolist()) if not teacher_assignments.empty else []
        })

    return jsonify({
        'success': False,
        'message': 'Invalid teacher credentials'
    })

@app.route('/api/admin-login', methods=['POST'])
def admin_login():
    data = request.json or {}
    email = data.get('email', '').lower()
    password = data.get('password', '')
    admins = load_admins()
    match = admins[admins['email'].str.lower() == email]

    if not match.empty and match.iloc[0]['password_hash'] == hash_password(password):
        admin = match.iloc[0].to_dict()
        return jsonify({
            'success': True,
            'admin_id': admin['admin_id'],
            'name': admin['name'],
            'email': admin['email'],
            'role': 'admin'
        })

    return jsonify({'success': False, 'message': 'Invalid admin credentials'})

@app.route('/api/password-reset-request', methods=['POST'])
def create_password_reset_request():
    data = request.json or {}
    role = str(data.get('role', '')).lower()
    email = str(data.get('email', '')).strip()
    if role not in ['student', 'teacher'] or not valid_email(email):
        return jsonify({'success': False, 'message': 'Valid role and registered email are required'}), 400

    if role == 'student':
        users = prepare_students(load_csv('students.csv'))
        match = users[users['email'].fillna('').astype(str).str.lower() == email.lower()]
        id_field = 'usn'
    else:
        users = load_teachers()
        match = users[users['email'].fillna('').astype(str).str.lower() == email.lower()]
        id_field = 'username'

    generic_message = 'If the email is registered, a reset link has been sent.'
    if match.empty:
        return jsonify({'success': True, 'message': generic_message})

    user_row = match.iloc[0].to_dict()
    requests_df = prepare_password_reset_requests(load_csv('password_reset_requests.csv'))
    token = secrets.token_urlsafe(32)
    token_hash = hash_password(token)
    expires_at = datetime.now() + timedelta(minutes=RESET_TOKEN_MINUTES)
    reset_url = f"{frontend_base_url()}/reset-password?token={token}"

    row = {
        'id': next_id(requests_df),
        'role': role,
        'email': email,
        'identifier': user_row.get(id_field, ''),
        'name': user_row.get('name', ''),
        'status': 'sent',
        'requested_at': datetime.now().isoformat(timespec='seconds'),
        'resolved_at': '',
        'resolved_by': '',
        'token_hash': token_hash,
        'expires_at': expires_at.isoformat(timespec='seconds'),
        'email_sent': False,
        'reset_url': reset_url
    }
    email_sent = False
    email_message = generic_message
    try:
        email_sent, email_message = send_reset_email(email, user_row.get('name', ''), reset_url)
    except Exception as exc:
        email_message = f"Reset link created, but email could not be sent: {exc}"
    row['email_sent'] = email_sent
    if not email_sent:
        row['status'] = 'email_failed'

    requests_df = pd.concat([requests_df, pd.DataFrame([row])], ignore_index=True)
    save_csv(requests_df, 'password_reset_requests.csv')
    response = {'success': email_sent, 'message': email_message if email_sent else 'Email service is currently unavailable. Please contact the administrator.'}
    if app.debug and not email_sent:
        response['reset_url'] = reset_url
    return jsonify(response), 200 if email_sent else 503

@app.route('/api/password-reset/<token>', methods=['GET', 'POST'])
def password_reset_token(token):
    requests_df = prepare_password_reset_requests(load_csv('password_reset_requests.csv'))
    token_hash = hash_password(token)
    matches = requests_df[
        (requests_df['token_hash'].astype(str) == token_hash) &
        (requests_df['status'].isin(['sent', 'email_failed']))
    ]
    if matches.empty:
        return jsonify({'success': False, 'message': 'Invalid or expired reset link'}), 404

    idx = matches.index[-1]
    row = requests_df.loc[idx].to_dict()
    expires_at = pd.to_datetime(row.get('expires_at'), errors='coerce')
    if pd.isna(expires_at) or expires_at.to_pydatetime() < datetime.now():
        requests_df.loc[idx, 'status'] = 'expired'
        save_csv(requests_df, 'password_reset_requests.csv')
        return jsonify({'success': False, 'message': 'Reset link has expired'}), 410

    if request.method == 'GET':
        return jsonify({'success': True, 'role': row.get('role'), 'email': row.get('email'), 'name': row.get('name')})

    data = request.json or {}
    new_password = str(data.get('new_password', ''))
    if len(new_password) < 8:
        return jsonify({'success': False, 'message': 'New password must be at least 8 characters'}), 400

    if row.get('role') == 'student':
        users = prepare_students(load_csv('students.csv'))
        user_idx = users[users['usn'].astype(str).str.upper() == str(row.get('identifier')).upper()].index
        if len(user_idx) == 0:
            return jsonify({'success': False, 'message': 'Student account not found'}), 404
        users.loc[user_idx[0], 'password'] = hash_password(new_password)
        save_csv(users, 'students.csv')
    elif row.get('role') == 'teacher':
        users = load_teachers()
        user_idx = users[users['username'].astype(str).str.lower() == str(row.get('identifier')).lower()].index
        if len(user_idx) == 0:
            return jsonify({'success': False, 'message': 'Teacher account not found'}), 404
        users.loc[user_idx[0], 'password'] = hash_password(new_password)
        save_csv(users, 'teachers.csv')
    else:
        return jsonify({'success': False, 'message': 'Unsupported reset link'}), 400

    requests_df.loc[idx, 'status'] = 'used'
    requests_df.loc[idx, 'token_hash'] = ''
    requests_df.loc[idx, 'reset_url'] = ''
    requests_df.loc[idx, 'resolved_at'] = datetime.now().isoformat(timespec='seconds')
    save_csv(requests_df, 'password_reset_requests.csv')
    return jsonify({'success': True, 'message': 'Password reset successfully'})

@app.route('/api/teacher/change-password', methods=['POST'])
def change_teacher_password():
    data = request.json or {}
    username = data.get('username', '').lower()
    current_password = str(data.get('current_password', ''))
    new_password = str(data.get('new_password', ''))

    if len(new_password) < 4:
        return jsonify({'success': False, 'message': 'New password must be at least 4 characters'}), 400

    teachers = load_teachers()
    idx = teachers[teachers['username'].astype(str).str.lower() == username].index
    if len(idx) == 0:
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404
    if not verify_password(teachers.loc[idx[0], 'password'], current_password):
        return jsonify({'success': False, 'message': 'Current password is incorrect'}), 403

    teachers.loc[idx[0], 'password'] = hash_password(new_password)
    save_csv(teachers, 'teachers.csv')
    return jsonify({'success': True, 'message': 'Password updated successfully'})


@app.route('/api/mark-attendance', methods=['POST'])
def mark_attendance():
    data = request.json

    result, error = save_attendance_record(
        data.get('usn', '').upper(),
        data.get('subject_id'),
        data.get('status'),
        data.get('date')
    )

    if error:
        return jsonify({'success': False, 'message': error}), 400

    return jsonify({
        'success': True,
        'message': 'Attendance marked successfully',
        'attendance': result
    })

@app.route('/api/teacher/attendance', methods=['POST'])
def teacher_mark_attendance():
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    data = request.json
    records = data.get('records', [])

    if not records:
        return jsonify({'success': False, 'message': 'No attendance records provided'}), 400

    saved_records = []
    allowed_subject_ids = teacher_allowed_subject_ids(teacher)
    if not allowed_subject_ids:
        return jsonify({'success': False, 'message': 'No assigned subjects found for this section'}), 403
    students = prepare_students(load_csv('students.csv'))
    for record in records:
        subject_id = int(record.get('subject_id', 0))
        if subject_id not in allowed_subject_ids:
            return jsonify({'success': False, 'message': 'Teachers can only modify their assigned subject'}), 403
        student = students[students['usn'] == record.get('usn', '').upper()]
        if student.empty or student.iloc[0]['section'] != teacher['section']:
            return jsonify({'success': False, 'message': 'Teachers can only modify students in their assigned section'}), 403

        result, error = save_attendance_record(
            record.get('usn', '').upper(),
            subject_id,
            record.get('status'),
            record.get('date')
        )
        if error:
            return jsonify({'success': False, 'message': error}), 400
        saved_records.append(result)

    return jsonify({
        'success': True,
        'message': 'Attendance saved successfully',
        'records': saved_records
    })

@app.route('/api/students', methods=['GET'])
def get_students():
    students = prepare_students(load_csv('students.csv'))
    has_teacher_filter = bool(request.args.get('teacher_username') or request.args.get('section'))
    if has_teacher_filter:
        username, teacher, error_response = require_teacher()
        if error_response:
            return error_response
        students = students[students['section'] == teacher['section']]
    return jsonify(public_student_records(students))

@app.route('/api/teacher/subjects', methods=['GET'])
def get_teacher_subjects():
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    return jsonify(teacher_allowed_subjects(teacher))

@app.route('/api/uploads/<path:filename>', methods=['GET'])
def download_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename, as_attachment=True)

@app.route('/api/student/<usn>', methods=['GET'])
def get_student(usn):
    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'] == usn]
    if student.empty:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify(public_student_records(student)[0])

@app.route('/api/attendance/<usn>', methods=['GET'])
def get_attendance(usn):
    attendance = prepare_attendance(load_csv('attendance.csv'))
    subjects = load_csv('subjects.csv')

    student_att = attendance[attendance['usn'] == usn]

    result = []
    for _, subject in subjects.iterrows():
        subj_att = student_att[student_att['subject_id'] == subject['id']]
        total, attended, missed = attendance_counts(subj_att)
        percentage = (attended / total * 100) if total > 0 else 0

        result.append({
            'subject': subject['name'],
            'subject_code': subject['code'],
            'faculty': subject['faculty'],
            'total': total,
            'attended': attended,
            'missed': missed,
            'percentage': round(percentage, 1)
        })

    return jsonify(result)

@app.route('/api/attendance-summary/<usn>', methods=['GET'])
def get_attendance_summary(usn):
    attendance = prepare_attendance(load_csv('attendance.csv'))
    student_att = attendance[attendance['usn'] == usn]

    total_classes, attended, missed = attendance_counts(student_att)
    percentage = (attended / total_classes * 100) if total_classes > 0 else 0

    return jsonify({
        'total': total_classes,
        'attended': attended,
        'missed': missed,
        'percentage': round(percentage, 1)
    })

@app.route('/api/attendance-history/<usn>', methods=['GET'])
def get_student_attendance_history(usn):
    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'].astype(str).str.upper() == usn.upper()]
    if student.empty:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    attendance = prepare_attendance(load_csv('attendance.csv'))
    if attendance.empty:
        return jsonify([])

    rows = attendance[attendance['usn'].astype(str).str.upper() == usn.upper()].copy()
    subject = request.args.get('subject', '').strip()
    status = request.args.get('status', '').strip()
    start_date = request.args.get('start_date', '').strip()
    end_date = request.args.get('end_date', '').strip()

    if subject:
        subjects = load_csv('subjects.csv')
        if not subjects.empty:
            subject_ids = subjects[
                (subjects['code'].astype(str) == subject) |
                (subjects['name'].astype(str) == subject)
            ]['id'].tolist()
            rows = rows[rows['subject_id'].isin(subject_ids)]
    if status in COUNTED_ATTENDANCE_STATUSES:
        rows = rows[rows['status'] == status]
    if start_date:
        rows = rows[rows['date'].astype(str) >= start_date]
    if end_date:
        rows = rows[rows['date'].astype(str) <= end_date]

    return jsonify(attendance_history_records(rows))

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    subjects = load_csv('subjects.csv')
    return jsonify(subjects.to_dict('records'))

@app.route('/api/timetable/<usn>', methods=['GET'])
def get_timetable(usn):
    timetable = prepare_timetable(load_csv('timetable.csv'))
    subjects = load_csv('subjects.csv')
    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'] == usn]
    if student.empty:
        return jsonify([])
    section = student.iloc[0]['section']
    timetable = timetable[timetable['section'] == section].copy()

    timetable = timetable.merge(subjects[['code', 'name']], left_on='subject_code', right_on='code', how='left')
    timetable['name'] = timetable['name'].fillna(timetable['subject'])
    timetable['faculty'] = timetable['teacher']
    timetable = timetable.sort_values(['day', 'start_time'])

    return jsonify(timetable.to_dict('records'))

@app.route('/api/teacher/timetable', methods=['GET'])
def get_teacher_timetable():
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    timetable = prepare_timetable(load_csv('timetable.csv'))
    teacher_rows = timetable[
        (
            (timetable['teacher_id'].astype(str) == str(teacher['teacher_id'])) |
            (timetable['teacher'].astype(str) == str(teacher['name']))
        ) &
        (timetable['section'] == teacher['section'])
    ].copy()
    teacher_rows = teacher_rows.sort_values(['day', 'start_time'])
    teacher_rows['name'] = teacher_rows['subject']
    teacher_rows['faculty'] = teacher_rows['teacher']
    return jsonify(teacher_rows.fillna('').to_dict('records'))

@app.route('/api/assignments/<usn>', methods=['GET'])
def get_assignments(usn):
    assignments = prepare_assignments(load_csv('assignments.csv'))
    subjects = load_csv('subjects.csv')
    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'] == usn]
    if student.empty:
        return jsonify([])
    section = student.iloc[0]['section']

    student_assign = assignments[
        (assignments['usn'] == usn) &
        (assignments['section'].fillna(DEFAULT_SECTION).replace('', DEFAULT_SECTION) == section)
    ].copy()
    student_assign['completed'] = student_assign['completed'].apply(is_true)
    student_assign = student_assign.merge(subjects[['code', 'name']], left_on='subject', right_on='code', how='left')
    student_assign = student_assign.sort_values('due_date')

    return jsonify(student_assign.fillna('').to_dict('records'))

@app.route('/api/assignments/<id>', methods=['PUT'])
def update_assignment(id):
    data = request.json
    assignments = prepare_assignments(load_csv('assignments.csv'))

    idx = assignments[assignments['id'] == id].index
    if len(idx) == 0:
        idx = assignments[assignments['id'].astype(str) == str(id)].index
    if len(idx) > 0:
        assignments.loc[idx[0], 'completed'] = data.get('completed', False)
        if data.get('completed', False):
            assignments.loc[idx[0], 'submitted_at'] = datetime.now().isoformat(timespec='seconds')
        save_csv(assignments, 'assignments.csv')
        return jsonify({'success': True})

    return jsonify({'error': 'Assignment not found'}), 404

@app.route('/api/assignments/<id>/submit', methods=['POST'])
def submit_assignment(id):
    assignments = prepare_assignments(load_csv('assignments.csv'))
    idx = assignments[assignments['id'].astype(str) == str(id)].index
    if len(idx) == 0:
        return jsonify({'success': False, 'message': 'Assignment not found'}), 404

    file_path, file_name = save_upload(request.files.get('file'), 'submissions')
    if file_path is None:
        return jsonify({'success': False, 'message': 'Unsupported file type'}), 400

    assignments.loc[idx[0], 'completed'] = True
    assignments.loc[idx[0], 'submitted_at'] = datetime.now().isoformat(timespec='seconds')
    assignments.loc[idx[0], 'submission_file_path'] = file_path
    assignments.loc[idx[0], 'submission_file_name'] = file_name
    save_csv(assignments, 'assignments.csv')
    return jsonify({'success': True, 'message': 'Assignment submitted successfully'})

@app.route('/api/teacher/assignments', methods=['GET', 'POST'])
def teacher_assignments():
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    assignments = prepare_assignments(load_csv('assignments.csv'))
    subjects = load_csv('subjects.csv')
    students = prepare_students(load_csv('students.csv'))
    allowed_subjects = teacher_allowed_subjects(teacher)
    allowed_subject_codes = {subject['code'] for subject in allowed_subjects}

    if request.method == 'GET':
        groups = []
        grouped = assignments[
            (assignments['creator'] == username) &
            (assignments['teacher_id'].astype(str) == str(teacher['teacher_id'])) &
            (assignments['section'] == teacher['section'])
        ].copy()
        if grouped.empty:
            return jsonify([])
        grouped['assignment_group_id'] = grouped['assignment_group_id'].replace('', pd.NA).fillna(grouped['id'].astype(str))
        for group_id, group in grouped.groupby('assignment_group_id'):
            first = group.iloc[0]
            submitted = group['completed'].apply(is_true).sum()
            groups.append({
                'assignment_group_id': group_id,
                'title': first.get('title', ''),
                'description': first.get('description', ''),
                'subject': first.get('subject', ''),
                'due_date': first.get('due_date', ''),
                'priority': first.get('priority', ''),
                'file_path': first.get('file_path', ''),
                'file_name': first.get('file_name', ''),
                'total': len(group),
                'submitted': int(submitted),
                'pending': int(len(group) - submitted)
            })
        return jsonify(sorted(groups, key=lambda item: item['due_date']))

    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    due_date = request.form.get('due_date', '').strip()
    subject_code = request.form.get('subject', '').strip()
    priority = request.form.get('priority', 'Medium').strip()

    if not title or not due_date or not subject_code:
        return jsonify({'success': False, 'message': 'Title, due date, and subject are required'}), 400
    if subject_code not in allowed_subject_codes:
        return jsonify({'success': False, 'message': 'Teachers can only create assignments for their assigned subject'}), 403

    file_path, file_name = save_upload(request.files.get('file'), 'assignments')
    if file_path is None:
        return jsonify({'success': False, 'message': 'Unsupported file type'}), 400

    group_id = uuid.uuid4().hex
    current_id = next_id(assignments)
    new_rows = []
    section_students = students[students['section'] == teacher['section']]
    for _, student in section_students.iterrows():
        new_rows.append({
            'id': current_id,
            'usn': student['usn'],
            'subject': subject_code,
            'title': title,
            'due_date': due_date,
            'priority': priority,
            'completed': False,
            'description': description,
            'assignment_group_id': group_id,
            'creator': username,
            'teacher_id': teacher['teacher_id'],
            'section': teacher['section'],
            'file_path': file_path,
            'file_name': file_name,
            'submitted_at': '',
            'submission_file_path': '',
            'submission_file_name': ''
        })
        current_id += 1

    assignments = pd.concat([assignments, pd.DataFrame(new_rows)], ignore_index=True)
    save_csv(assignments, 'assignments.csv')
    return jsonify({'success': True, 'message': 'Assignment created successfully', 'assignment_group_id': group_id})

@app.route('/api/teacher/assignments/<group_id>/submissions', methods=['GET'])
def teacher_assignment_submissions(group_id):
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    assignments = prepare_assignments(load_csv('assignments.csv'))
    students = prepare_students(load_csv('students.csv'))

    owned_assignments = assignments[
        (assignments['creator'] == username) &
        (assignments['teacher_id'].astype(str) == str(teacher['teacher_id'])) &
        (assignments['section'] == teacher['section'])
    ].copy()
    group = owned_assignments[owned_assignments['assignment_group_id'].astype(str) == str(group_id)].copy()
    if group.empty:
        group = owned_assignments[owned_assignments['id'].astype(str) == str(group_id)].copy()
    if group.empty:
        return jsonify({'success': False, 'message': 'Assignment not found'}), 404

    group = group.merge(students[['usn', 'name']], on='usn', how='left')
    submitted = group['completed'].apply(is_true).sum()
    return jsonify({
        'success': True,
        'title': group.iloc[0].get('title', ''),
        'total': len(group),
        'submitted': int(submitted),
        'pending': int(len(group) - submitted),
        'students': group.fillna('').to_dict('records')
    })

@app.route('/api/notifications/<usn>', methods=['GET'])
def get_notifications(usn):
    notifications = prepare_notifications(load_csv('notifications.csv'))
    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'] == usn]
    if student.empty:
        return jsonify([])
    section = student.iloc[0]['section']
    notification_section = notifications['section'].fillna('').astype(str)
    direct = notifications['usn'] == usn
    broadcast = (
        notifications['recipient_type'].isin(['class', 'section', 'all', 'all_users']) &
        notification_section.isin([section, '', 'ALL']) &
        (notifications['usn'].fillna('').astype(str).isin(['', usn]))
    )
    student_notif = notifications[
        direct | broadcast
    ].copy()
    student_notif = unique_notifications(student_notif).sort_values('date', ascending=False)
    return jsonify(student_notif.fillna('').to_dict('records'))

@app.route('/api/notifications/<id>', methods=['PUT'])
def update_notification(id):
    data = request.json
    notifications = prepare_notifications(load_csv('notifications.csv'))
    today = datetime.now().strftime('%Y-%m-%d')
    today_name = datetime.now().strftime('%A')

    idx = notifications[notifications['id'].astype(str) == str(id)].index
    if len(idx) > 0:
        notifications.loc[idx[0], 'read'] = data.get('read', True)
        save_csv(notifications, 'notifications.csv')
        return jsonify({'success': True})

    return jsonify({'error': 'Notification not found'}), 404

@app.route('/api/teacher/notifications', methods=['GET', 'POST'])
def teacher_notifications():
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    notifications = prepare_notifications(load_csv('notifications.csv'))
    students = prepare_students(load_csv('students.csv'))

    if request.method == 'GET':
        teacher_owned = (
            (notifications['teacher_username'] == username) &
            (notifications['teacher_id'].astype(str) == str(teacher['teacher_id'])) &
            (notifications['section'] == teacher['section'])
        )
        admin_to_teacher = (
            (notifications['recipient_type'].astype(str).isin(['teacher', 'teachers', 'all_users'])) &
            (
                (notifications['teacher_id'].fillna('').astype(str) == '') |
                (notifications['teacher_id'].astype(str) == str(teacher['teacher_id']))
            )
        )
        sent = notifications[teacher_owned | admin_to_teacher].copy()
        sent = unique_notifications(sent)
        sent = sent.sort_values('date', ascending=False)
        return jsonify(sent.fillna('').to_dict('records'))

    data = request.json
    title = data.get('title', '').strip()
    message = data.get('message', '').strip()
    notif_type = data.get('type', 'info')
    recipient_type = data.get('recipient_type', 'class')
    selected_usns = data.get('usns', [])
    sender = data.get('sender', teacher['name'])

    if not title or not message:
        return jsonify({'success': False, 'message': 'Title and message are required'}), 400

    if recipient_type == 'students':
        allowed = students[students['section'] == teacher['section']]['usn'].tolist()
        recipients = [usn.upper() for usn in selected_usns if usn.upper() in allowed]
    else:
        recipients = students[students['section'] == teacher['section']]['usn'].tolist()

    if not recipients:
        return jsonify({'success': False, 'message': 'Select at least one student'}), 400

    current_id = next_id(notifications)
    today_date = datetime.now().strftime('%Y-%m-%d')
    rows = []
    stored_recipients = recipients if recipient_type == 'students' else ['']
    for usn in stored_recipients:
        rows.append({
            'id': current_id,
            'usn': usn,
            'title': title,
            'message': message,
            'type': notif_type,
            'date': today_date,
            'read': False,
            'sender': sender,
            'teacher_username': username,
            'teacher_id': teacher['teacher_id'],
            'section': teacher['section'],
            'recipient_type': recipient_type
        })
        current_id += 1

    notifications = pd.concat([notifications, pd.DataFrame(rows)], ignore_index=True)
    save_csv(notifications, 'notifications.csv')
    return jsonify({'success': True, 'message': 'Notification sent successfully', 'count': len(recipients)})

@app.route('/api/teacher/notifications/<int:notification_id>', methods=['PUT', 'DELETE'])
def teacher_notification_item(notification_id):
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    notifications = prepare_notifications(load_csv('notifications.csv'))
    id_match = pd.to_numeric(notifications['id'], errors='coerce') == int(notification_id)
    owned = (
        id_match &
        (notifications['teacher_username'].astype(str) == username) &
        (notifications['teacher_id'].astype(str) == str(teacher['teacher_id'])) &
        (notifications['section'].astype(str) == teacher['section'])
    )
    admin_to_teacher = (
        id_match &
        (notifications['recipient_type'].astype(str).isin(['teacher', 'teachers', 'all_users'])) &
        (
            (notifications['teacher_id'].fillna('').astype(str) == '') |
            (notifications['teacher_id'].astype(str) == str(teacher['teacher_id']))
        )
    )
    if not owned.any() and not admin_to_teacher.any():
        return jsonify({'success': False, 'message': 'Notification not found'}), 404

    if request.method == 'DELETE':
        if not owned.any():
            return jsonify({'success': False, 'message': 'Teachers can only delete notifications they created'}), 403
        notifications = notifications.drop(notifications[owned].index).reset_index(drop=True)
        save_csv(notifications, 'notifications.csv')
        return jsonify({'success': True, 'message': 'Notification deleted'})

    data = request.json or {}
    if admin_to_teacher.any() and not owned.any():
        notifications.loc[admin_to_teacher, 'read'] = data.get('read', True)
        save_csv(notifications, 'notifications.csv')
        return jsonify({'success': True, 'message': 'Notification marked as read'})
    for field in ['title', 'message', 'type']:
        if field in data:
            notifications.loc[owned, field] = data[field]
    if 'read' in data:
        notifications.loc[owned, 'read'] = data.get('read')
    save_csv(notifications, 'notifications.csv')
    return jsonify({'success': True, 'message': 'Notification updated'})

@app.route('/api/predict', methods=['POST'])
def predict_bunk():
    data = request.json
    usn = data.get('usn')
    target_percentage = data.get('target', 75)

    attendance = prepare_attendance(load_csv('attendance.csv'))
    subjects = load_csv('subjects.csv')

    student_att = attendance[attendance['usn'] == usn]

    predictions = []
    for _, subject in subjects.iterrows():
        subj_att = student_att[student_att['subject_id'] == subject['id']]
        total, attended, missed = attendance_counts(subj_att)

        if total == 0:
            continue

        current_percentage = (attended / total) * 100
        classes_needed = (target_percentage * total / 100) - attended
        can_miss = attended - (target_percentage * total / 100)

        if current_percentage > target_percentage:
            status = 'safe'
        elif current_percentage == target_percentage:
            status = 'warning'
        else:
            status = 'critical'

        predictions.append({
            'subject': subject['name'],
            'subject_code': subject['code'],
            'current_percentage': round(current_percentage, 1),
            'can_miss': max(0, math.floor(can_miss)) if can_miss > 0 else 0,
            'classes_needed': max(0, math.ceil(classes_needed)),
            'status': status
        })

    return jsonify(predictions)

def format_records(records, empty_message, limit=8):
    if not records:
        return empty_message
    return "\n".join(records[:limit])


def normalize_query(text):
    return re.findall(r'[a-z0-9]+', str(text).lower())

def text_score(query, text):
    query_terms = set(normalize_query(query))
    if not query_terms:
        return 0
    text_terms = set(normalize_query(text))
    return len(query_terms & text_terms)

def retrieve_faq_answer(query):
    faqs = load_csv('faqs.csv')
    if faqs.empty:
        return None
    best = None
    best_score = 0
    for _, row in faqs.iterrows():
        searchable = f"{row.get('question', '')} {row.get('answer', '')} {row.get('tags', '')}"
        score = text_score(query, searchable)
        if score > best_score:
            best = row
            best_score = score
    if best is not None and best_score >= 2:
        return str(best.get('answer', ''))
    return None

def retrieve_knowledge(query):
    path = os.path.join(DATA_DIR, 'knowledge_base.txt')
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as kb_file:
        paragraphs = [part.strip() for part in kb_file.read().split('\n\n') if part.strip()]
    best = None
    best_score = 0
    for paragraph in paragraphs:
        score = text_score(query, paragraph)
        if score > best_score:
            best = paragraph
            best_score = score
    return best if best_score >= 2 else None

def student_scope(user):
    usn = (user or {}).get('usn', '').upper()
    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'] == usn]
    if student.empty:
        return usn, '', None
    return usn, student.iloc[0]['section'], student.iloc[0].to_dict()

def requested_day(query):
    q = query.lower()
    if 'tomorrow' in q:
        return (datetime.now() + timedelta(days=1)).strftime('%A')
    if 'today' in q:
        return datetime.now().strftime('%A')
    for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
        if day in q:
            return day.title()
    return ''

def subject_matches(query, subjects):
    q = query.lower()
    matches = []
    for _, subject in subjects.iterrows():
        code = str(subject.get('code', '')).lower()
        name = str(subject.get('name', '')).lower()
        if code and code in q or name and name in q:
            matches.append(subject.to_dict())
    return matches

def query_has_any(query, terms):
    q = query.lower()
    return any(term in q for term in terms)

def detect_chat_intent(query):
    q = query.lower()
    if query_has_any(q, ['miss', 'missed', 'absent', 'absence', 'attendance', 'present']):
        return 'attendance'
    if query_has_any(q, ['timetable', 'schedule', 'class', 'classes', 'period']) and query_has_any(q, ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']):
        return 'timetable'
    if query_has_any(q, ['assignment', 'assignments', 'homework', 'pending', 'due', 'submission']):
        return 'assignments'
    if query_has_any(q, ['mark', 'marks', 'cie', 'see', 'score', 'grade']):
        return 'marks'
    if query_has_any(q, ['notification', 'notice', 'announcement']):
        return 'notifications'
    if query_has_any(q, ['advice', 'recommend', 'explain', 'summary', 'summarize', 'improve', 'what should i do', 'help me']):
        return 'advice'
    return 'faq'

def should_use_llama(query, intent):
    if intent in ['attendance', 'timetable', 'assignments', 'marks', 'notifications']:
        return query_has_any(query, ['advice', 'recommend', 'explain', 'summary', 'summarize', 'improve', 'what should i do'])
    return intent == 'advice'

def log_chat_debug(question, intent, source, context):
    print('--- PredictED Chat Debug ---', flush=True)
    print(f'User question: {question}', flush=True)
    print(f'Intent detected: {intent}', flush=True)
    print(f'Data source used: {source}', flush=True)
    print('Context sent to Llama:', flush=True)
    print(context if context else '[NO LLAMA CALL - direct data response]', flush=True)
    print('--- End Chat Debug ---', flush=True)

def rag_attendance_answer(query, user):
    usn, section, student = student_scope(user)
    if not usn:
        return None
    attendance = prepare_attendance(load_csv('attendance.csv'))
    subjects = load_csv('subjects.csv')
    if attendance.empty or subjects.empty:
        return 'Attendance data was not found.'
    student_att = attendance[attendance['usn'] == usn]
    if student_att.empty:
        return 'Attendance data was not found for your account.'
    subject_filter = subject_matches(query, subjects)
    rows = subject_filter if subject_filter else subjects.to_dict('records')
    lines = []
    for subject in rows:
        subj_att = student_att[student_att['subject_id'] == subject['id']]
        total, present, missed = attendance_counts(subj_att)
        percentage = round((present / total * 100) if total else 0, 1)
        lines.append(f"{subject['code']}: {percentage}% ({present} present, {missed} absent, {total} counted classes)")
    return 'Your attendance:\n' + '\n'.join(lines)

def rag_missed_classes_answer(query, user):
    usn, section, student = student_scope(user)
    day = requested_day(query)
    if not usn:
        return None
    attendance = prepare_attendance(load_csv('attendance.csv'))
    subjects = load_csv('subjects.csv')
    if attendance.empty:
        return 'No missed class data was found.'
    student_att = attendance[(attendance['usn'] == usn) & (attendance['status'] == 'Absent')].copy()
    if student_att.empty:
        return 'No missed classes were found for your account.'
    student_att['day'] = pd.to_datetime(student_att['date'], errors='coerce').dt.day_name()
    missed = student_att[student_att['day'] == day] if day else student_att
    if missed.empty:
        return f'No missed classes were found for {day}.'
    missed = missed.merge(subjects[['id', 'code', 'name', 'faculty']], left_on='subject_id', right_on='id', how='left')
    missed = missed.sort_values('date', ascending=False)
    lines = [f"{row.get('date', '')} ({row.get('day', '')}): {row.get('code', row.get('subject_id', ''))} - {row.get('name', '')} with {row.get('faculty', '')}" for _, row in missed.head(12).iterrows()]
    title = f'Classes you missed on {day}:' if day else 'Classes you missed:'
    return title + '\n' + '\n'.join(lines)

def rag_timetable_answer(query, user):
    usn, section, student = student_scope(user)
    day = requested_day(query)
    if not section or not day:
        return None
    timetable = prepare_timetable(load_csv('timetable.csv'))
    if timetable.empty:
        return 'Timetable data was not found.'
    rows = timetable[(timetable['section'] == section) & (timetable['day'].astype(str).str.lower() == day.lower())].copy()
    if rows.empty:
        return f'No timetable entries were found for {day}.'
    rows = rows.sort_values('start_time')
    lines = [f"{row.get('start_time', '')}-{row.get('end_time', '')}: {row.get('subject_code', '') or row.get('subject', '')} with {row.get('teacher', '')} in {row.get('room', '')}" for _, row in rows.iterrows()]
    return f'Your classes for {day}:\n' + '\n'.join(lines)

def rag_assignments_answer(query, user):
    usn, section, student = student_scope(user)
    if not usn:
        return None
    assignments = prepare_assignments(load_csv('assignments.csv'))
    if assignments.empty:
        return 'Assignment data was not found.'
    rows = assignments[(assignments['usn'] == usn) & (assignments['section'].fillna(DEFAULT_SECTION).replace('', DEFAULT_SECTION) == section)].copy()
    if 'pending' in query.lower():
        rows = rows[~rows['completed'].apply(is_true)]
    if rows.empty:
        return 'No matching assignments were found.'
    rows = rows.sort_values('due_date')
    lines = [f"{row.get('title', '')} ({row.get('subject', '')}) due {row.get('due_date', '')}: {'submitted' if is_true(row.get('completed', False)) else 'pending'}" for _, row in rows.head(10).iterrows()]
    return 'Assignments:\n' + '\n'.join(lines)

def rag_marks_answer(query, user):
    usn, section, student = student_scope(user)
    if not usn:
        return None
    marks = prepare_marks(load_csv('marks.csv'))
    if marks.empty:
        return 'Marks data was not found.'
    rows = marks[marks['student_id'].astype(str).str.upper() == usn]
    subjects = load_csv('subjects.csv')
    subject_filter = subject_matches(query, subjects) if not subjects.empty else []
    if subject_filter:
        codes = {item['code'] for item in subject_filter}
        rows = rows[rows['subject'].isin(codes)]
    if rows.empty:
        return 'Marks data was not found for the requested subject.'
    rows = pd.DataFrame(marks_records(rows))
    lines = [f"{row.get('subject', '')}: CIE1 {row.get('CIE1', '')}, CIE2 {row.get('CIE2', '')}, CIE3 {row.get('CIE3', '')}, SEE {row.get('SEE', '')}, Average {row.get('subject_average', '')}%" for _, row in rows.iterrows()]
    return 'Your marks:\n' + '\n'.join(lines)

def rag_notifications_answer(query, user):
    usn, section, student = student_scope(user)
    if not usn:
        return None
    notifications = prepare_notifications(load_csv('notifications.csv'))
    if notifications.empty:
        return 'Notification data was not found.'
    notification_section = notifications['section'].fillna('').astype(str)
    rows = notifications[(notifications['usn'] == usn) | ((notifications['recipient_type'].isin(['class', 'section', 'all', 'all_users'])) & notification_section.isin([section, '', 'ALL']) & notifications['usn'].fillna('').astype(str).isin(['', usn]))].copy()
    rows = unique_notifications(rows).sort_values('date', ascending=False)
    if rows.empty:
        return 'No notifications were found for you.'
    lines = [f"{row.get('date', '')}: {row.get('title', '')} - {row.get('message', '')}" for _, row in rows.head(8).iterrows()]
    return 'Notifications:\n' + '\n'.join(lines)

def rag_answer(query, user):
    q = query.lower()
    intent = detect_chat_intent(query)
    if intent == 'attendance' and query_has_any(q, ['miss', 'missed', 'absent', 'absence']):
        answer = rag_missed_classes_answer(query, user)
        if answer: return answer, 'attendance', intent
    if intent == 'attendance':
        answer = rag_attendance_answer(query, user)
        if answer: return answer, 'attendance', intent
    if intent == 'timetable':
        answer = rag_timetable_answer(query, user)
        if answer: return answer, 'timetable', intent
    if intent == 'assignments':
        answer = rag_assignments_answer(query, user)
        if answer: return answer, 'assignments', intent
    if intent == 'marks':
        answer = rag_marks_answer(query, user)
        if answer: return answer, 'marks', intent
    if intent == 'notifications':
        answer = rag_notifications_answer(query, user)
        if answer: return answer, 'notifications', intent
    faq = retrieve_faq_answer(query)
    if faq:
        return faq, 'faq', intent
    knowledge = retrieve_knowledge(query)
    if knowledge and not should_use_llama(query, intent):
        return knowledge, 'knowledge_base', intent
    return None, '', intent

def build_student_chat_context(user):
    usn = (user or {}).get('usn', '').upper()
    students = prepare_students(load_csv('students.csv'))
    attendance = prepare_attendance(load_csv('attendance.csv'))
    assignments = prepare_assignments(load_csv('assignments.csv'))
    notifications = prepare_notifications(load_csv('notifications.csv'))
    subjects = load_csv('subjects.csv')
    timetable = prepare_timetable(load_csv('timetable.csv'))

    student = students[students['usn'] == usn]
    if student.empty:
        return "No student profile was found for the logged-in user."

    student_row = student.iloc[0]
    section = student_row['section']
    student_att = attendance[attendance['usn'] == usn] if not attendance.empty else pd.DataFrame()
    student_assignments = assignments[
        (assignments['usn'] == usn) &
        (assignments['section'].fillna(DEFAULT_SECTION).replace('', DEFAULT_SECTION) == section)
    ].copy() if not assignments.empty else pd.DataFrame()

    notification_section = notifications['section'].fillna('').astype(str) if not notifications.empty else pd.Series(dtype=str)
    student_notifications = notifications[
        (notifications['usn'] == usn) |
        (
            (notifications['recipient_type'].isin(['class', 'section', 'all', 'all_users'])) &
            notification_section.isin([section, '', 'ALL']) &
            (notifications['usn'].fillna('').astype(str).isin(['', usn]))
        )
    ].copy() if not notifications.empty else pd.DataFrame()
    student_notifications = unique_notifications(student_notifications)
    section_timetable = timetable[timetable['section'] == section].copy() if not timetable.empty else pd.DataFrame()

    attendance_lines = []
    for _, subject in subjects.iterrows():
        subj_att = student_att[student_att['subject_id'] == subject['id']] if not student_att.empty else pd.DataFrame()
        total, attended, missed = attendance_counts(subj_att)
        percentage = round((attended / total * 100) if total else 0, 1)
        can_miss = max(0, math.floor(attended - (0.75 * total))) if total else 0
        attendance_lines.append(f"- {subject['code']}: {percentage}% ({attended}/{total}); safe misses at 75% target: {can_miss}")

    assignment_lines = []
    if not student_assignments.empty:
        student_assignments = student_assignments.sort_values('due_date')
        for _, assignment in student_assignments.iterrows():
            status = 'submitted' if is_true(assignment.get('completed', False)) else 'pending'
            assignment_lines.append(f"- {assignment.get('title', '')} ({assignment.get('subject', '')}) due {assignment.get('due_date', '')}: {status}")

    notification_lines = []
    if not student_notifications.empty:
        student_notifications = student_notifications.sort_values('date', ascending=False)
        for _, notification in student_notifications.head(6).iterrows():
            notification_lines.append(f"- {notification.get('date', '')}: {notification.get('title', '')} - {notification.get('message', '')}")

    timetable_lines = []
    if not section_timetable.empty:
        for _, cls in section_timetable.sort_values(['day', 'start_time']).head(10).iterrows():
            timetable_lines.append(f"- {cls.get('day', '')} {cls.get('start_time', '')}-{cls.get('end_time', '')}: {cls.get('subject', '')} with {cls.get('teacher', '')} in {cls.get('room', '')}")

    return f"""Logged-in student:
Name: {student_row.get('name', '')}
USN: {usn}
Section: {section}
Branch/Semester: {student_row.get('branch', '')} / {student_row.get('semester', '')}

Attendance by subject:
{format_records(attendance_lines, 'No attendance records are available.')}

Assignments:
{format_records(assignment_lines, 'No assignments are currently assigned.')}

Notifications:
{format_records(notification_lines, 'No notifications are available.')}

Timetable:
{format_records(timetable_lines, 'No timetable entries are available for this section.')}
"""

def build_teacher_chat_context(user):
    username = (user or {}).get('username', '').lower()
    teachers = load_teachers()
    teacher_match = teachers[teachers['username'].str.lower() == username]
    if teacher_match.empty:
        return "No teacher profile was found for the logged-in user."

    teacher = teacher_match.iloc[0].to_dict()
    teacher_mappings = assignments_for_teacher(teacher)
    if teacher_mappings.empty:
        return "No section or subject assignments were found for this teacher."
    teacher.update(teacher_mappings.iloc[0].to_dict())
    subject = teacher_subject(teacher)
    subject_id = teacher_subject_id(teacher)
    section = teacher['section']

    students = prepare_students(load_csv('students.csv'))
    attendance = prepare_attendance(load_csv('attendance.csv'))
    assignments = prepare_assignments(load_csv('assignments.csv'))
    notifications = prepare_notifications(load_csv('notifications.csv'))
    timetable = prepare_timetable(load_csv('timetable.csv'))

    section_students = students[students['section'] == section].copy()
    subject_att = attendance[
        (attendance['section'] == section) &
        (attendance['subject_id'] == subject_id)
    ].copy() if not attendance.empty and subject_id is not None else pd.DataFrame()
    teacher_assignments = assignments[
        (assignments['creator'] == username) &
        (assignments['teacher_id'].astype(str) == str(teacher['teacher_id'])) &
        (assignments['section'] == section)
    ].copy() if not assignments.empty else pd.DataFrame()
    teacher_notifications = notifications[
        (notifications['teacher_username'] == username) &
        (notifications['teacher_id'].astype(str) == str(teacher['teacher_id']))
    ].copy() if not notifications.empty else pd.DataFrame()
    teacher_classes = timetable[
        ((timetable['teacher_id'].astype(str) == str(teacher['teacher_id'])) |
         (timetable['teacher'].astype(str) == str(teacher['name']))) &
        (timetable['section'] == section)
    ].copy() if not timetable.empty else pd.DataFrame()

    student_lines = []
    below_threshold = []
    for _, student in section_students.iterrows():
        student_att = subject_att[subject_att['usn'] == student['usn']] if not subject_att.empty else pd.DataFrame()
        total, attended, missed = attendance_counts(student_att)
        percentage = round((attended / total * 100) if total else 0, 1)
        line = f"- {student['name']} ({student['usn']}): {percentage}% ({attended}/{total})"
        student_lines.append(line)
        if percentage < 75:
            below_threshold.append(line)

    assignment_lines = []
    if not teacher_assignments.empty:
        grouped = teacher_assignments.groupby('assignment_group_id')
        for _, group in grouped:
            first = group.iloc[0]
            submitted = group['completed'].apply(is_true).sum()
            assignment_lines.append(f"- {first.get('title', '')} due {first.get('due_date', '')}: {submitted}/{len(group)} submitted")

    notification_lines = []
    if not teacher_notifications.empty:
        for _, notification in teacher_notifications.sort_values('date', ascending=False).head(6).iterrows():
            notification_lines.append(f"- {notification.get('date', '')}: {notification.get('title', '')} to {notification.get('recipient_type', '')}")

    class_lines = []
    if not teacher_classes.empty:
        for _, cls in teacher_classes.sort_values(['day', 'start_time']).iterrows():
            class_lines.append(f"- {cls.get('day', '')} {cls.get('start_time', '')}-{cls.get('end_time', '')}: {cls.get('subject', '')} in {cls.get('room', '')}")

    return f"""Logged-in teacher:
Name: {teacher.get('name', '')}
Teacher ID: {teacher.get('teacher_id', '')}
Subject: {subject.get('name', teacher.get('subject', '')) if subject else teacher.get('subject', '')}
Section: {section}

Class roster and attendance for assigned subject/section:
{format_records(student_lines, 'No students or attendance records are available.', limit=12)}

Students below 75%:
{format_records(below_threshold, 'No students are currently below 75%.', limit=12)}

Assignments created by this teacher:
{format_records(assignment_lines, 'No teacher-created assignments are available.')}

Notifications sent by this teacher:
{format_records(notification_lines, 'No teacher-created notifications are available.')}

Teacher timetable:
{format_records(class_lines, 'No classes are assigned in the timetable.')}
"""

def build_local_context(user):
    role = (user or {}).get('role', 'student')
    if role == 'teacher':
        return build_teacher_chat_context(user)
    return build_student_chat_context(user)

def local_context_fallback(user_message, context, model_status):
    return (
        f"I can read your PredictED data, but Ollama is not ready ({model_status}).\n\n"
        f"Here is the relevant app context I found:\n{context}\n\n"
        f"Your question was: {user_message}\n"
        "Start Ollama with `ollama serve` and ensure `llama3:latest` is installed for a full AI answer."
    )

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json or {}
    user_message = data.get('message', '').strip()
    user = data.get('user') or {}
    model_name = os.environ.get('OLLAMA_MODEL', 'llama3:latest')
    context = build_local_context(user)

    if not user_message:
        return jsonify({'response': 'Please type a question so I can help with your academic data.'})

    retrieved_answer, source, intent = rag_answer(user_message, user)
    if retrieved_answer:
        if not should_use_llama(user_message, intent):
            log_chat_debug(user_message, intent, source, '')
            return jsonify({'response': retrieved_answer, 'source': source, 'rag': True})
        context = f"Retrieved facts from {source}:\n{retrieved_answer}\n\n{context}"

    prompt = f"""You are PredictED, a local academic assistant running through Ollama.
Use only the application context below. If a detail is missing, say what is missing.
Give concise, practical advice. For attendance questions, include percentages and 75% threshold guidance when available.
For timetable questions, mention day, time, teacher, and room when available.

Application context:
{context}

User question:
{user_message}
"""
    log_chat_debug(user_message, intent, source or 'local_context', context)

    try:
        import requests
        tags_response = requests.get('http://localhost:11434/api/tags', timeout=5)
        if tags_response.status_code != 200:
            return jsonify({'response': local_context_fallback(user_message, context, 'Ollama tags endpoint did not respond successfully')})

        installed_models = [model.get('name') for model in tags_response.json().get('models', [])]
        if model_name not in installed_models:
            return jsonify({'response': local_context_fallback(user_message, context, f'{model_name} is not installed. Installed models: {", ".join(installed_models) or "none"}')})

        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': model_name,
                'prompt': prompt,
                'stream': False
            },
            timeout=120
        )

        if response.status_code == 200:
            bot_response = response.json().get('response', 'I could not generate a response.')
        else:
            bot_response = local_context_fallback(user_message, context, f'Ollama returned HTTP {response.status_code}')
    except Exception as e:
        bot_response = local_context_fallback(user_message, context, str(e))

    return jsonify({'response': bot_response, 'model': model_name})

@app.route('/api/attendance-trend/<usn>', methods=['GET'])
def get_attendance_trend(usn):
    attendance = prepare_attendance(load_csv('attendance.csv'))
    student_att = attendance[attendance['usn'] == usn].copy()

    return jsonify(attendance_daily_trend(student_att))

@app.route('/api/marks/<usn>', methods=['GET'])
def get_student_marks(usn):
    marks = prepare_marks(load_csv('marks.csv'))
    student_marks = marks[marks['student_id'].astype(str).str.upper() == usn.upper()].copy()
    return jsonify(marks_records(student_marks))

@app.route('/api/teacher/marks', methods=['GET', 'POST'])
def teacher_marks():
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    marks = prepare_marks(load_csv('marks.csv'))
    students = prepare_students(load_csv('students.csv'))
    section_students = students[students['section'] == teacher['section']].copy()
    subject_code = teacher.get('subject_code', '')
    teacher_id = str(teacher.get('teacher_id', ''))

    if request.method == 'GET':
        section_marks = marks[
            (marks['section'] == teacher['section']) &
            (marks['subject'] == subject_code) &
            (marks['teacher_id'].astype(str) == teacher_id)
        ].copy() if not marks.empty else pd.DataFrame()
        rows = []
        for _, student in section_students.iterrows():
            existing = section_marks[section_marks['student_id'] == student['usn']] if not section_marks.empty else pd.DataFrame()
            if existing.empty:
                rows.append({
                    'student_id': student['usn'],
                    'student_name': student['name'],
                    'section': teacher['section'],
                    'subject': subject_code,
                    'teacher_id': teacher_id,
                    'CIE1': '',
                    'CIE2': '',
                    'CIE3': '',
                    'SEE': ''
                })
            else:
                rows.append(existing.iloc[0].to_dict())
        return jsonify(marks_records(pd.DataFrame(rows)))

    data = request.json or {}
    records = data.get('records', [])
    if not records:
        return jsonify({'success': False, 'message': 'No marks records provided'}), 400

    if marks.empty:
        marks = pd.DataFrame(columns=['student_id', 'student_name', 'section', 'subject', 'teacher_id', 'CIE1', 'CIE2', 'CIE3', 'SEE'])

    saved = 0
    allowed_usns = set(section_students['usn'].astype(str))
    for record in records:
        student_id = str(record.get('student_id', '')).upper()
        if student_id not in allowed_usns:
            return jsonify({'success': False, 'message': 'Teachers can only edit students in their section'}), 403
        student = section_students[section_students['usn'] == student_id].iloc[0]
        existing = (
            (marks['student_id'].astype(str) == student_id) &
            (marks['subject'].astype(str) == subject_code) &
            (marks['section'].astype(str) == teacher['section'])
        )
        values = {
            'student_id': student_id,
            'student_name': student['name'],
            'section': teacher['section'],
            'subject': subject_code,
            'teacher_id': teacher_id,
            'CIE1': record.get('CIE1', ''),
            'CIE2': record.get('CIE2', ''),
            'CIE3': record.get('CIE3', ''),
            'SEE': record.get('SEE', '')
        }
        if existing.any():
            for key, value in values.items():
                marks.loc[existing, key] = value
        else:
            marks = pd.concat([marks, pd.DataFrame([values])], ignore_index=True)
        saved += 1

    save_csv(prepare_marks(marks), 'marks.csv')
    return jsonify({'success': True, 'message': 'Marks saved successfully', 'count': saved})

@app.route('/api/admin/students', methods=['GET', 'POST'])
def admin_students():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    students = prepare_students(load_csv('students.csv'))
    if request.method == 'GET':
        return jsonify(public_student_records(students))
    data = request.json or {}
    usn = data.get('usn', '').upper()
    email = str(data.get('email', '')).strip()
    if not usn or not data.get('name'):
        return jsonify({'success': False, 'message': 'USN and name are required'}), 400
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400
    if not valid_email(email):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400
    if email_exists(email):
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    if not students[students['usn'].astype(str).str.upper() == usn].empty:
        return jsonify({'success': False, 'message': 'Student already exists'}), 400
    row = {
        'usn': usn,
        'name': data.get('name', ''),
        'email': email,
        'phone': data.get('phone', ''),
        'semester': data.get('semester', ''),
        'branch': data.get('branch', ''),
        'section': data.get('section', DEFAULT_SECTION),
        'password': data.get('password', 'student123')
    }
    students = pd.concat([students, pd.DataFrame([row])], ignore_index=True)
    save_csv(students, 'students.csv')
    return jsonify({'success': True, 'message': 'Student created'})

@app.route('/api/admin/students/<usn>', methods=['PUT', 'DELETE'])
def admin_student_item(usn):
    admin, error_response = require_admin()
    if error_response:
        return error_response
    students = prepare_students(load_csv('students.csv'))
    idx = students[students['usn'].astype(str).str.upper() == usn.upper()].index
    if len(idx) == 0:
        return jsonify({'success': False, 'message': 'Student not found'}), 404
    if request.method == 'DELETE':
        password_error = require_admin_password(admin)
        if password_error:
            return password_error
        students = students.drop(idx)
        save_csv(students, 'students.csv')
        return jsonify({'success': True, 'message': 'Student deleted'})
    data = request.json or {}
    email = str(data.get('email', students.loc[idx[0], 'email'])).strip()
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400
    if not valid_email(email):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400
    if email_exists(email, ignore={'usn': usn.upper()}):
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    for field in ['name', 'email', 'phone', 'semester', 'branch', 'section', 'password']:
        if field in data:
            students.loc[idx[0], field] = data[field]
    save_csv(students, 'students.csv')
    return jsonify({'success': True, 'message': 'Student updated'})

@app.route('/api/admin/teachers', methods=['GET', 'POST'])
def admin_teachers():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    teachers = load_teachers()
    if request.method == 'GET':
        return jsonify(teachers.drop(columns=['password'], errors='ignore').fillna('').to_dict('records'))
    data = request.json or {}
    email = str(data.get('email', '')).strip()
    if not data.get('teacher_id') or not data.get('username') or not data.get('name'):
        return jsonify({'success': False, 'message': 'Teacher ID, username, and name are required'}), 400
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400
    if not valid_email(email):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400
    if email_exists(email):
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    if not teachers[teachers['teacher_id'].astype(str) == str(data.get('teacher_id'))].empty:
        return jsonify({'success': False, 'message': 'Teacher already exists'}), 400
    row = {
        'teacher_id': data.get('teacher_id'),
        'username': data.get('username'),
        'password': data.get('password', 'teacher123'),
        'name': data.get('name'),
        'email': email
    }
    teachers = pd.concat([teachers, pd.DataFrame([row])], ignore_index=True)
    save_csv(teachers, 'teachers.csv')
    return jsonify({'success': True, 'message': 'Teacher created'})

@app.route('/api/admin/teachers/<teacher_id>', methods=['PUT', 'DELETE'])
def admin_teacher_item(teacher_id):
    admin, error_response = require_admin()
    if error_response:
        return error_response
    teachers = load_teachers()
    idx = teachers[teachers['teacher_id'].astype(str) == str(teacher_id)].index
    if len(idx) == 0:
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404
    if request.method == 'DELETE':
        password_error = require_admin_password(admin)
        if password_error:
            return password_error
        teachers = teachers.drop(idx)
        save_csv(teachers, 'teachers.csv')
        return jsonify({'success': True, 'message': 'Teacher deleted'})
    data = request.json or {}
    email = str(data.get('email', teachers.loc[idx[0], 'email'])).strip()
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400
    if not valid_email(email):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400
    if email_exists(email, ignore={'teacher_id': teacher_id}):
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    for field in ['username', 'password', 'name', 'email']:
        if field in data:
            teachers.loc[idx[0], field] = data[field]
    save_csv(teachers, 'teachers.csv')
    return jsonify({'success': True, 'message': 'Teacher updated'})

@app.route('/api/admin/teacher-assignments', methods=['GET', 'POST'])
def admin_teacher_assignments():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    mappings = load_teacher_assignments()
    teachers = load_teachers()
    if request.method == 'GET':
        rows = mappings.merge(teachers[['teacher_id', 'name']], on='teacher_id', how='left')
        records = rows.fillna('').to_dict('records')
        for index, row in enumerate(records):
            row['id'] = index
        return jsonify(records)
    data = request.json or {}
    teacher_id = str(data.get('teacher_id', '')).strip()
    section = str(data.get('section', DEFAULT_SECTION)).strip() or DEFAULT_SECTION
    subject_code = str(data.get('subject_code', '')).strip()
    subject = str(data.get('subject', '')).strip()
    if not teacher_id or not subject_code:
        return jsonify({'success': False, 'message': 'Teacher ID and subject code are required'}), 400
    if teachers[teachers['teacher_id'].astype(str) == teacher_id].empty:
        return jsonify({'success': False, 'message': 'Teacher account not found'}), 404
    duplicate = mappings[
        (mappings['teacher_id'].astype(str) == teacher_id) &
        (mappings['section'].astype(str) == section) &
        (mappings['subject_code'].astype(str) == subject_code)
    ]
    if not duplicate.empty:
        return jsonify({'success': False, 'message': 'Teacher assignment already exists'}), 400
    mappings = pd.concat([mappings, pd.DataFrame([{
        'teacher_id': teacher_id,
        'section': section,
        'subject': subject,
        'subject_code': subject_code
    }])], ignore_index=True)
    save_csv(mappings, 'teacher_assignments.csv')
    return jsonify({'success': True, 'message': 'Teacher assignment created'})

@app.route('/api/admin/teacher-assignments/<int:row_id>', methods=['PUT', 'DELETE'])
def admin_teacher_assignment_item(row_id):
    admin, error_response = require_admin()
    if error_response:
        return error_response
    mappings = load_teacher_assignments()
    if row_id < 0 or row_id >= len(mappings):
        return jsonify({'success': False, 'message': 'Teacher assignment not found'}), 404
    if request.method == 'DELETE':
        password_error = require_admin_password(admin)
        if password_error:
            return password_error
        mappings = mappings.drop(mappings.index[row_id]).reset_index(drop=True)
        save_csv(mappings, 'teacher_assignments.csv')
        return jsonify({'success': True, 'message': 'Teacher assignment deleted'})
    data = request.json or {}
    for field in ['teacher_id', 'section', 'subject', 'subject_code']:
        if field in data:
            mappings.loc[mappings.index[row_id], field] = data[field]
    save_csv(mappings, 'teacher_assignments.csv')
    return jsonify({'success': True, 'message': 'Teacher assignment updated'})

@app.route('/api/admin/timetable', methods=['GET', 'POST'])
def admin_timetable():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    timetable = prepare_timetable(load_csv('timetable.csv'))
    if request.method == 'GET':
        rows = timetable.fillna('').to_dict('records')
        for index, row in enumerate(rows):
            row['id'] = index
        return jsonify(rows)
    data = request.json or {}
    row = {field: data.get(field, '') for field in ['section', 'day', 'start_time', 'end_time', 'subject', 'subject_code', 'teacher', 'teacher_id', 'room']}
    timetable = pd.concat([timetable.drop(columns=['time_slot'], errors='ignore'), pd.DataFrame([row])], ignore_index=True)
    save_csv(timetable, 'timetable.csv')
    return jsonify({'success': True, 'message': 'Class added'})

@app.route('/api/admin/timetable/<int:row_id>', methods=['PUT', 'DELETE'])
def admin_timetable_item(row_id):
    admin, error_response = require_admin()
    if error_response:
        return error_response
    timetable = prepare_timetable(load_csv('timetable.csv')).drop(columns=['time_slot'], errors='ignore')
    if row_id < 0 or row_id >= len(timetable):
        return jsonify({'success': False, 'message': 'Class not found'}), 404
    if request.method == 'DELETE':
        password_error = require_admin_password(admin)
        if password_error:
            return password_error
        timetable = timetable.drop(timetable.index[row_id])
        save_csv(timetable, 'timetable.csv')
        return jsonify({'success': True, 'message': 'Class deleted'})
    data = request.json or {}
    for field in ['section', 'day', 'start_time', 'end_time', 'subject', 'subject_code', 'teacher', 'teacher_id', 'room']:
        if field in data:
            timetable.iat[row_id, timetable.columns.get_loc(field)] = data[field]
    save_csv(timetable, 'timetable.csv')
    return jsonify({'success': True, 'message': 'Class updated'})

@app.route('/api/admin/marks', methods=['GET', 'POST'])
def admin_marks():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    marks = prepare_marks(load_csv('marks.csv'))
    if request.method == 'GET':
        return jsonify(marks_records(marks))
    data = request.json or {}
    records = data.get('records', [data])
    if marks.empty:
        marks = pd.DataFrame(columns=['student_id', 'student_name', 'section', 'subject', 'teacher_id', 'CIE1', 'CIE2', 'CIE3', 'SEE'])
    for record in records:
        student_id = str(record.get('student_id', '')).upper()
        subject = str(record.get('subject', ''))
        section = str(record.get('section', ''))
        existing = (
            (marks['student_id'].astype(str) == student_id) &
            (marks['subject'].astype(str) == subject) &
            (marks['section'].astype(str) == section)
        )
        values = {field: record.get(field, '') for field in ['student_id', 'student_name', 'section', 'subject', 'teacher_id', 'CIE1', 'CIE2', 'CIE3', 'SEE']}
        values['student_id'] = student_id
        if existing.any():
            for key, value in values.items():
                marks.loc[existing, key] = value
        else:
            marks = pd.concat([marks, pd.DataFrame([values])], ignore_index=True)
    save_csv(prepare_marks(marks), 'marks.csv')
    return jsonify({'success': True, 'message': 'Marks saved'})

@app.route('/api/admin/attendance', methods=['GET'])
def admin_attendance():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    attendance = prepare_attendance(load_csv('attendance.csv'))
    if attendance.empty:
        return jsonify([])
    usn = request.args.get('usn', '').upper()
    if usn:
        attendance = attendance[attendance['usn'].astype(str).str.upper() == usn]
    students = prepare_students(load_csv('students.csv'))
    subjects = load_csv('subjects.csv')
    rows = attendance.copy()
    rows['id'] = rows.index
    if not students.empty:
        student_cols = students[['usn', 'name', 'section']].rename(columns={'name': 'student_name', 'section': 'student_section'})
        rows = rows.merge(student_cols, on='usn', how='left')
    if not subjects.empty:
        subject_cols = subjects[['id', 'code', 'name']].rename(columns={'id': 'subject_lookup_id', 'code': 'subject_code', 'name': 'subject_name'})
        rows = rows.merge(subject_cols, left_on='subject_id', right_on='subject_lookup_id', how='left')
    return jsonify(rows.drop(columns=['subject_lookup_id'], errors='ignore').fillna('').to_dict('records'))

@app.route('/api/admin/assignments', methods=['GET'])
def admin_assignments():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    assignments = prepare_assignments(load_csv('assignments.csv'))
    if assignments.empty:
        return jsonify([])
    rows = assignments.copy()
    rows['id'] = rows.index
    return jsonify(rows.fillna('').to_dict('records'))

@app.route('/api/admin/notifications', methods=['GET', 'POST'])
def admin_send_notification():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    notifications = prepare_notifications(load_csv('notifications.csv'))
    if request.method == 'GET':
        sent = unique_notifications(notifications).sort_values('date', ascending=False)
        return jsonify(sent.fillna('').to_dict('records'))
    data = request.json or {}
    title = data.get('title', '').strip()
    message = data.get('message', '').strip()
    target_type = data.get('target_type', 'all')
    if not title or not message:
        return jsonify({'success': False, 'message': 'Title and message are required'}), 400
    current_id = next_id(notifications)
    section = data.get('section', '')
    usn = data.get('usn', '').upper() if target_type == 'student' else ''
    if target_type in ['all', 'all_users']:
        section = 'ALL'
    row = {
        'id': current_id,
        'usn': usn,
        'title': title,
        'message': message,
        'type': data.get('type', 'info'),
        'date': datetime.now().strftime('%Y-%m-%d'),
        'read': False,
        'sender': admin['name'],
        'recipient_type': target_type,
        'teacher_username': '',
        'teacher_id': data.get('teacher_id', ''),
        'section': section
    }
    notifications = pd.concat([notifications, pd.DataFrame([row])], ignore_index=True)
    save_csv(notifications, 'notifications.csv')
    return jsonify({'success': True, 'message': 'Notification sent'})

@app.route('/api/admin/password-reset-requests', methods=['GET'])
def admin_password_reset_requests():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    requests_df = prepare_password_reset_requests(load_csv('password_reset_requests.csv'))
    requests_df = requests_df.sort_values('requested_at', ascending=False)
    return jsonify(requests_df.fillna('').to_dict('records'))

@app.route('/api/admin/analytics', methods=['GET'])
def admin_analytics():
    admin, error_response = require_admin()
    if error_response:
        return error_response
    students = prepare_students(load_csv('students.csv'))
    teachers = load_teachers()
    attendance = prepare_attendance(load_csv('attendance.csv'))
    marks = prepare_marks(load_csv('marks.csv'))
    assignments = prepare_assignments(load_csv('assignments.csv'))
    notifications = prepare_notifications(load_csv('notifications.csv'))
    today = datetime.now().strftime('%Y-%m-%d')
    today_name = datetime.now().strftime('%A')

    section_perf = []
    if not marks.empty:
        mark_rows = pd.DataFrame(marks_records(marks))
        if not mark_rows.empty:
            section_perf = mark_rows.groupby('section')['subject_average'].mean().round(1).reset_index().to_dict('records')
            subject_perf = mark_rows.groupby('subject')['subject_average'].mean().round(1).reset_index().to_dict('records')
            top_performers = mark_rows.sort_values('subject_average', ascending=False).head(8).to_dict('records')
            at_risk = mark_rows[mark_rows['subject_average'] < 40].sort_values('subject_average').head(8).to_dict('records')
        else:
            subject_perf, top_performers, at_risk = [], [], []
    else:
        subject_perf, top_performers, at_risk = [], [], []

    attendance_stats = []
    students_present_today = 0
    students_absent_today = 0
    attendance_shortage_students = 0
    if not attendance.empty:
        today_attendance = attendance[attendance['date'].astype(str) == today]
        students_present_today = today_attendance[today_attendance['status'] == 'Present']['usn'].nunique()
        students_absent_today = today_attendance[today_attendance['status'] == 'Absent']['usn'].nunique()
        for section, group in attendance.groupby('section'):
            total, present, missed = attendance_counts(group)
            attendance_stats.append({'section': section, 'total': total, 'present': present, 'missed': missed, 'percentage': round((present / total * 100) if total else 0, 1)})
        for usn, group in attendance.groupby('usn'):
            total, present, missed = attendance_counts(group)
            if total and (present / total * 100) < 75:
                attendance_shortage_students += 1

    timetable = prepare_timetable(load_csv('timetable.csv'))
    classes_running_today = len(timetable[timetable['day'].astype(str).str.lower() == today_name.lower()]) if not timetable.empty else 0
    assignments_due_this_week = 0
    pending_assignments = 0
    if not assignments.empty:
        due_dates = pd.to_datetime(assignments['due_date'], errors='coerce')
        week_end = datetime.now() + timedelta(days=7)
        assignments_due_this_week = int(((due_dates >= datetime.now()) & (due_dates <= week_end)).sum())
        pending_assignments = int((~assignments['completed'].apply(is_true)).sum())
    unread_notifications = int((notifications['read'].astype(str).str.lower() != 'true').sum()) if not notifications.empty else 0

    return jsonify({
        'cards': {
            'total_students': len(students),
            'total_teachers': len(teachers),
            'total_assignments': len(assignments),
            'total_notifications': len(notifications),
            'total_marks': len(marks),
            'students_present_today': students_present_today,
            'students_absent_today': students_absent_today,
            'classes_running_today': classes_running_today,
            'assignments_due_this_week': assignments_due_this_week,
            'unread_notifications': unread_notifications,
            'attendance_shortage_students': attendance_shortage_students,
            'pending_assignments': max(0, pending_assignments)
        },
        'section_performance': section_perf,
        'subject_performance': subject_perf,
        'attendance_stats': attendance_stats,
        'top_performers': top_performers,
        'at_risk_students': at_risk
    })

@app.route('/api/teacher/attendance/history', methods=['GET'])
def teacher_attendance_history():
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    attendance = prepare_attendance(load_csv('attendance.csv'))
    subjects = load_csv('subjects.csv')
    students = prepare_students(load_csv('students.csv'))

    if attendance.empty:
        return jsonify([])

    result = attendance.copy()
    usn = request.args.get('usn', '').upper()
    allowed_subject_ids = teacher_allowed_subject_ids(teacher)
    if not allowed_subject_ids:
        return jsonify([])
    default_subject_id = next(iter(allowed_subject_ids))
    subject_id = request.args.get('subject_id', str(default_subject_id))
    date = request.args.get('date', '')
    if int(subject_id) not in allowed_subject_ids:
        return jsonify({'success': False, 'message': 'Teachers can only view their assigned subject'}), 403

    if usn:
        result = result[result['usn'] == usn]
    result = result[
        (result['subject_id'] == int(subject_id)) &
        (result['section'] == teacher['section'])
    ]
    if date:
        result = result[result['date'] == date]

    result = result.merge(students[['usn', 'name']], on='usn', how='left')
    result = result.merge(subjects[['id', 'name', 'code']], left_on='subject_id', right_on='id', how='left')
    result = result.sort_values('date', ascending=False)
    return jsonify(result.fillna('').to_dict('records'))

@app.route('/api/teacher/student-attendance/<usn>', methods=['GET'])
def teacher_student_attendance(usn):
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    allowed_subjects = teacher_allowed_subjects(teacher)
    allowed_subject_ids = teacher_allowed_subject_ids(teacher)
    if not allowed_subjects:
        return jsonify({'success': False, 'message': 'No assigned subjects found for this section'}), 403
    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'] == usn]
    if student.empty or student.iloc[0]['section'] != teacher['section']:
        return jsonify({'success': False, 'message': 'Student not found in assigned section'}), 404

    history = prepare_attendance(load_csv('attendance.csv'))
    subjects = load_csv('subjects.csv')
    subject_id = int(request.args.get('subject_id') or allowed_subjects[0]['id'])
    if subject_id not in allowed_subject_ids:
        return jsonify({'success': False, 'message': 'Teachers can only view their assigned subject'}), 403
    subject = next((item for item in allowed_subjects if int(item['id']) == subject_id), allowed_subjects[0])
    student_att = history[
        (history['usn'] == usn) &
        (history['subject_id'] == subject_id) &
        (history['section'] == teacher['section'])
    ].copy() if not history.empty else pd.DataFrame()

    total, attended, missed = attendance_counts(student_att)
    percentage = round((attended / total * 100) if total else 0, 1)

    attendance_response = [{
        'subject': subject['name'] if subject else '',
        'subject_code': subject['code'] if subject else '',
        'faculty': subject['faculty'] if subject else '',
        'total': total,
        'attended': attended,
        'missed': missed,
        'percentage': percentage
    }]
    summary_response = {
        'total': total,
        'attended': attended,
        'missed': missed,
        'percentage': percentage
    }

    trend_response = attendance_daily_trend(student_att)

    if not student_att.empty:
        history = student_att.merge(
            subjects[['id', 'name', 'code']],
            left_on='subject_id',
            right_on='id',
            how='left'
        ).sort_values('date', ascending=False)
    else:
        history = pd.DataFrame()

    return jsonify({
        'attendance': attendance_response,
        'summary': summary_response,
        'trend': trend_response,
        'history': history.fillna('').to_dict('records') if not history.empty else []
    })

@app.route('/api/teacher/class-analytics', methods=['GET'])
def teacher_class_analytics():
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    students = prepare_students(load_csv('students.csv'))
    subjects = load_csv('subjects.csv')
    attendance = prepare_attendance(load_csv('attendance.csv'))
    assignments = prepare_assignments(load_csv('assignments.csv'))
    notifications = prepare_notifications(load_csv('notifications.csv'))
    allowed_subjects = teacher_allowed_subjects(teacher)
    allowed_subject_ids = teacher_allowed_subject_ids(teacher)
    if not allowed_subjects:
        return jsonify({'success': False, 'message': 'No assigned subjects found for this section'}), 403
    subject_id = int(request.args.get('subject_id') or allowed_subjects[0]['id'])
    if subject_id not in allowed_subject_ids:
        return jsonify({'success': False, 'message': 'Teachers can only view their assigned subject'}), 403
    subject = next((item for item in allowed_subjects if int(item['id']) == subject_id), allowed_subjects[0])
    section_students = students[students['section'] == teacher['section']].copy()
    subject_attendance = attendance[
        (attendance['subject_id'] == subject_id) &
        (attendance['section'] == teacher['section'])
    ].copy() if not attendance.empty else pd.DataFrame()
    teacher_assignments_df = assignments[
        (assignments['creator'] == username) &
        (assignments['teacher_id'].astype(str) == str(teacher['teacher_id'])) &
        (assignments['section'] == teacher['section'])
    ].copy()
    teacher_notifications_df = notifications[
        (notifications['teacher_username'] == username) &
        (notifications['teacher_id'].astype(str) == str(teacher['teacher_id'])) &
        (notifications['section'] == teacher['section'])
    ].copy()

    subject_stats = []
    for subject_row in ([subject] if subject else []):
        subj_att = subject_attendance
        total, present, missed = attendance_counts(subj_att)
        subject_stats.append({
            'subject': subject_row['name'],
            'subject_code': subject_row['code'],
            'total': total,
            'present': present,
            'percentage': round((present / total * 100) if total else 0, 1)
        })

    leaderboard = []
    below_threshold = []
    for _, student in section_students.iterrows():
        student_att = subject_attendance[subject_attendance['usn'] == student['usn']] if not subject_attendance.empty else pd.DataFrame()
        total, present, missed = attendance_counts(student_att)
        percentage = round((present / total * 100) if total else 0, 1)
        item = {
            'usn': student['usn'],
            'name': student['name'],
            'total': total,
            'present': present,
            'percentage': percentage
        }
        leaderboard.append(item)
        if percentage < 75:
            below_threshold.append(item)

    leaderboard = sorted(leaderboard, key=lambda item: item['percentage'], reverse=True)
    class_average = round(sum(item['percentage'] for item in leaderboard) / len(leaderboard), 1) if leaderboard else 0

    trend = attendance_daily_trend(subject_attendance)

    active_assignments = teacher_assignments_df[teacher_assignments_df['completed'].astype(str).str.lower() != 'true']
    pending_submissions = len(active_assignments)

    return jsonify({
        'cards': {
            'total_students': len(section_students),
            'below_threshold': len(below_threshold),
            'active_assignments': len(teacher_assignments_df['assignment_group_id'].replace('', pd.NA).dropna().unique()) if not teacher_assignments_df.empty else 0,
            'pending_submissions': pending_submissions,
            'notifications_sent': len(teacher_notifications_df) if not teacher_notifications_df.empty else 0
        },
        'class_average': class_average,
        'subject_stats': subject_stats,
        'below_threshold': below_threshold,
        'leaderboard': leaderboard,
        'trend': trend
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
















