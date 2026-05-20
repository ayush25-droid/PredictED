from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import math
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

VALID_USNS = ['1DS25AI016', '1DS25AI017', '1DS25AI018', '1DS25CD016', '1DS25CD017', '1DS25CD018']

def load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame()

def save_csv(df, filename):
    path = os.path.join(DATA_DIR, filename)
    df.to_csv(path, index=False)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    usn = data.get('usn', '').upper()

    if usn in VALID_USNS:
        students = load_csv('students.csv')
        student = students[students['usn'] == usn]
        if not student.empty:
            return jsonify({
                'success': True,
                'usn': usn,
                'name': student.iloc[0]['name']
            })
        return jsonify({'success': True, 'usn': usn, 'name': 'Student'})
    return jsonify({'success': False, 'message': 'Invalid USN'})

@app.route('/api/student/<usn>', methods=['GET'])
def get_student(usn):
    students = load_csv('students.csv')
    student = students[students['usn'] == usn]
    if student.empty:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify(student.iloc[0].to_dict())

@app.route('/api/attendance/<usn>', methods=['GET'])
def get_attendance(usn):
    attendance = load_csv('attendance.csv')
    subjects = load_csv('subjects.csv')

    student_att = attendance[attendance['usn'] == usn]

    result = []
    for _, subject in subjects.iterrows():
        subj_att = student_att[student_att['subject_id'] == subject['id']]
        total = len(subj_att)
        attended = len(subj_att[subj_att['status'] == 'Present'])
        missed = total - attended
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
    attendance = load_csv('attendance.csv')
    student_att = attendance[attendance['usn'] == usn]

    total_classes = len(student_att)
    attended = len(student_att[student_att['status'] == 'Present'])
    missed = total_classes - attended
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
    timetable = load_csv('timetable.csv')
    subjects = load_csv('subjects.csv')

    timetable = timetable.merge(subjects[['code', 'name']], left_on='subject_code', right_on='code', how='left')
    timetable = timetable.sort_values(['day', 'time_slot'])

    return jsonify(timetable.to_dict('records'))

@app.route('/api/assignments/<usn>', methods=['GET'])
def get_assignments(usn):
    assignments = load_csv('assignments.csv')
    subjects = load_csv('subjects.csv')

    student_assign = assignments[assignments['usn'] == usn].copy()
    student_assign = student_assign.merge(subjects[['code', 'name']], left_on='subject', right_on='code', how='left')
    student_assign = student_assign.sort_values('due_date')

    return jsonify(student_assign.to_dict('records'))

@app.route('/api/assignments/<id>', methods=['PUT'])
def update_assignment(id):
    data = request.json
    assignments = load_csv('assignments.csv')

    idx = assignments[assignments['id'] == id].index
    if len(idx) > 0:
        assignments.loc[idx[0], 'completed'] = data.get('completed', False)
        save_csv(assignments, 'assignments.csv')
        return jsonify({'success': True})

    return jsonify({'error': 'Assignment not found'}), 404

@app.route('/api/notifications/<usn>', methods=['GET'])
def get_notifications(usn):
    notifications = load_csv('notifications.csv')
    student_notif = notifications[notifications['usn'] == usn].sort_values('date', ascending=False)
    return jsonify(student_notif.to_dict('records'))

@app.route('/api/notifications/<id>', methods=['PUT'])
def update_notification(id):
    data = request.json
    notifications = load_csv('notifications.csv')

    idx = notifications[notifications['id'] == id].index
    if len(idx) > 0:
        notifications.loc[idx[0], 'read'] = data.get('read', True)
        save_csv(notifications, 'notifications.csv')
        return jsonify({'success': True})

    return jsonify({'error': 'Notification not found'}), 404

@app.route('/api/predict', methods=['POST'])
def predict_bunk():
    data = request.json
    usn = data.get('usn')
    target_percentage = data.get('target', 75)

    attendance = load_csv('attendance.csv')
    subjects = load_csv('subjects.csv')

    student_att = attendance[attendance['usn'] == usn]

    predictions = []
    for _, subject in subjects.iterrows():
        subj_att = student_att[student_att['subject_id'] == subject['id']]
        total = len(subj_att)
        attended = len(subj_att[subj_att['status'] == 'Present'])

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

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')

    try:
        import requests
        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': 'llama3',
                'prompt': f"""You are PredictED, a helpful academic assistant AI. You help students with:
- Study planning and tips
- Attendance and bunk predictions
- Academic guidance
- Productivity advice
- Assignment help

Keep responses concise and helpful. Current user message: {user_message}""",
                'stream': False
            },
            timeout=30
        )

        if response.status_code == 200:
            bot_response = response.json().get('response', 'I apologize, but I could not generate a response.')
        else:
            bot_response = "I'm currently offline. Please make sure Ollama is running with Llama 3 model."
    except Exception as e:
        bot_response = f"I'm having trouble connecting right now. Make sure Ollama is running locally with the Llama 3 model."

    return jsonify({'response': bot_response})

@app.route('/api/attendance-trend/<usn>', methods=['GET'])
def get_attendance_trend(usn):
    attendance = load_csv('attendance.csv')
    student_att = attendance[attendance['usn'] == usn].copy()

    if student_att.empty:
        return jsonify([])

    student_att['date'] = pd.to_datetime(student_att['date'])
    student_att = student_att.sort_values('date')

    daily_att = student_att.groupby('date')['status'].apply(
        lambda x: (x == 'Present').sum() / len(x) * 100
    ).reset_index()
    daily_att.columns = ['date', 'percentage']

    return jsonify(daily_att.to_dict('records'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)