from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import os
import math
import uuid
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

def unique_notifications(df):
    if df.empty:
        return df
    return df.drop_duplicates(
        subset=['title', 'message', 'type', 'date', 'sender', 'teacher_username', 'teacher_id', 'section', 'recipient_type'],
        keep='first'
    )

def prepare_students(df):
    df = ensure_columns(df, {'section': DEFAULT_SECTION, 'password': 'student123'})
    df['section'] = df['section'].fillna(DEFAULT_SECTION).replace('', DEFAULT_SECTION)
    df['password'] = df['password'].fillna('student123').replace('', 'student123').astype(str)
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
            {'teacher_id': 'T001', 'username': 'sandra', 'password': 'sandra123', 'name': 'Sandra Jestine', 'subject': 'Multivariate Calculus and Numerical Methods', 'subject_code': 'MCNM', 'section': DEFAULT_SECTION},
            {'teacher_id': 'T002', 'username': 'jayashri', 'password': 'jay123', 'name': 'Jayashri G M', 'subject': 'Python Programming', 'subject_code': 'PYTHON', 'section': 'AIML-B'}
        ])
    teachers = ensure_columns(teachers, {
        'teacher_id': '',
        'username': '',
        'password': '',
        'name': '',
        'subject': '',
        'subject_code': '',
        'section': DEFAULT_SECTION
    })
    teachers['section'] = teachers['section'].fillna(DEFAULT_SECTION).replace('', DEFAULT_SECTION)
    return teachers

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
    return username, teacher, None

def teacher_subject(teacher):
    subjects = load_csv('subjects.csv')
    if subjects.empty:
        return None
    subject = subjects[subjects['code'] == teacher.get('subject_code')]
    if subject.empty:
        subject = subjects[subjects['name'] == teacher.get('subject')]
    if subject.empty:
        return None
    return subject.iloc[0].to_dict()

def teacher_subject_id(teacher):
    subject = teacher_subject(teacher)
    return int(subject['id']) if subject else None

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
        if str(student.iloc[0]['password']) != password:
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
    if str(students.loc[idx[0], 'password']) != current_password:
        return jsonify({'success': False, 'message': 'Current password is incorrect'}), 403

    students.loc[idx[0], 'password'] = new_password
    save_csv(students, 'students.csv')
    return jsonify({'success': True, 'message': 'Password updated successfully'})

@app.route('/api/teacher-login', methods=['POST'])
def teacher_login():
    data = request.json

    username = data.get('username', '').lower()
    password = data.get('password', '')

    teachers = load_teachers()
    teacher_row = teachers[teachers['username'].str.lower() == username]

    if not teacher_row.empty and str(teacher_row.iloc[0]['password']) == password:
        teacher = teacher_row.iloc[0].to_dict()
        subject = teacher_subject(teacher)
        return jsonify({
            'success': True,
            'username': username,
            'teacher_id': teacher['teacher_id'],
            'name': teacher['name'],
            'subject_id': int(subject['id']) if subject else None,
            'subject': subject['name'] if subject else teacher['subject'],
            'subject_code': subject['code'] if subject else teacher['subject_code'],
            'section': teacher['section']
        })

    return jsonify({
        'success': False,
        'message': 'Invalid teacher credentials'
    })

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
    if str(teachers.loc[idx[0], 'password']) != current_password:
        return jsonify({'success': False, 'message': 'Current password is incorrect'}), 403

    teachers.loc[idx[0], 'password'] = new_password
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
    subject_id = teacher_subject_id(teacher)
    for record in records:
        if int(record.get('subject_id', 0)) != int(subject_id):
            return jsonify({'success': False, 'message': 'Teachers can only modify their assigned subject'}), 403
        students = prepare_students(load_csv('students.csv'))
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
    username, teacher = get_teacher_identity()
    if teacher:
        students = students[students['section'] == teacher['section']]
    return jsonify(public_student_records(students))

@app.route('/api/teacher/subjects', methods=['GET'])
def get_teacher_subjects():
    username, teacher, error_response = require_teacher()
    if error_response:
        return error_response

    subject = teacher_subject(teacher)
    return jsonify([subject] if subject else [])

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
        (timetable['teacher_id'].astype(str) == str(teacher['teacher_id'])) |
        ((timetable['teacher'].astype(str) == str(teacher['name'])) & (timetable['section'] == teacher['section']))
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
    subject = teacher_subject(teacher)

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
    if not teacher_subject(teacher) or subject_code != teacher_subject(teacher)['code']:
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
        notifications['recipient_type'].isin(['class', 'section', 'all']) &
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
        sent = notifications[
            (notifications['teacher_username'] == username) &
            (notifications['teacher_id'].astype(str) == str(teacher['teacher_id']))
        ].copy()
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
            (notifications['recipient_type'].isin(['class', 'section', 'all'])) &
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

    prompt = f"""You are PredictED, a local academic assistant running through Ollama.
Use only the application context below. If a detail is missing, say what is missing.
Give concise, practical advice. For attendance questions, include percentages and 75% threshold guidance when available.
For timetable questions, mention day, time, teacher, and room when available.

Application context:
{context}

User question:
{user_message}
"""

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
    teacher_subj_id = teacher_subject_id(teacher)
    subject_id = request.args.get('subject_id', str(teacher_subj_id))
    date = request.args.get('date', '')
    if int(subject_id) != int(teacher_subj_id):
        return jsonify({'success': False, 'message': 'Teachers can only view their assigned subject'}), 403

    if usn:
        result = result[result['usn'] == usn]
    result = result[
        (result['subject_id'] == int(teacher_subj_id)) &
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

    subject = teacher_subject(teacher)
    students = prepare_students(load_csv('students.csv'))
    student = students[students['usn'] == usn]
    if student.empty or student.iloc[0]['section'] != teacher['section']:
        return jsonify({'success': False, 'message': 'Student not found in assigned section'}), 404

    history = prepare_attendance(load_csv('attendance.csv'))
    subjects = load_csv('subjects.csv')
    subject_id = teacher_subject_id(teacher)
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
    subject = teacher_subject(teacher)
    subject_id = teacher_subject_id(teacher)
    section_students = students[students['section'] == teacher['section']].copy()
    subject_attendance = attendance[
        (attendance['subject_id'] == subject_id) &
        (attendance['section'] == teacher['section'])
    ].copy() if not attendance.empty else pd.DataFrame()
    teacher_assignments_df = assignments[assignments['creator'] == username].copy()
    teacher_notifications_df = notifications[notifications['teacher_username'] == username].copy()

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
