import os
from flask import Flask, render_template, request, redirect, url_for, jsonify, send_from_directory
import pandas as pd
import matplotlib.pyplot as plt
from werkzeug.utils import secure_filename
from fpdf import FPDF

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = os.path.join('static', 'uploads')
REPORT_FOLDER = 'reports'
ALLOWED_EXTENSIONS = {'csv', 'xlsx'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload and report directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(REPORT_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({'status': 'success', 'message': 'File uploaded successfully'})
    else:
        return jsonify({'status': 'error', 'message': 'Unsupported file type'}), 400

@app.route('/generate_chart', methods=['POST'])
def generate_chart():
    chart_type = request.json.get('type')
    filename = request.json.get('filename')

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(filepath):
        return jsonify({'status': 'error', 'message': 'File not found'}), 404

    # Read data
    if filename.endswith('.csv'):
        df = pd.read_csv(filepath)
    else:
        df = pd.read_excel(filepath)

    # Simple example: Assume the first two columns are used for plotting
    if df.shape[1] < 2:
        return jsonify({'status': 'error', 'message': 'Not enough columns for plotting'}), 400

    x = df.iloc[:, 0]
    y = df.iloc[:, 1]

    plt.figure(figsize=(8, 4))

    if chart_type == 'bar':
        plt.bar(x, y)
    elif chart_type == 'pie':
        plt.pie(y, labels=x, autopct='%1.1f%%')
    elif chart_type == 'line':
        plt.plot(x, y)
    else:
        return jsonify({'status': 'error', 'message': 'Invalid chart type'}), 400

    chart_filename = f"{chart_type}_chart.png"
    chart_path = os.path.join(app.config['UPLOAD_FOLDER'], chart_filename)
    plt.savefig(chart_path)
    plt.close()

    return jsonify({'status': 'success', 'chart_url': f'static/uploads/{chart_filename}'})

@app.route('/generate_report', methods=['POST'])
def generate_report():
    filename = request.json.get('filename')
    charts = request.json.get('charts')  # List of chart URLs

    pdf = FPDF()
    pdf.add_page()

    pdf.set_font("Arial", size=16)
    pdf.cell(200, 10, txt="Data Visualization Report", ln=True, align='C')

    for chart_url in charts:
        if not os.path.exists(chart_url.replace('/static/', '')):
            continue
        pdf.ln(10)
        pdf.image(chart_url.replace('/static/', ''), w=180)

    report_filename = 'report.pdf'
    report_path = os.path.join(REPORT_FOLDER, report_filename)
    pdf.output(report_path)

    return jsonify({'status': 'success', 'report_url': url_for('download_report')})

@app.route('/download_report', methods=['GET'])
def download_report():
    report_filename = 'report.pdf'  # Example report file
    report_path = os.path.join(REPORT_FOLDER, report_filename)
    if os.path.exists(report_path):
        return send_from_directory(REPORT_FOLDER, report_filename, as_attachment=True)
    else:
        return jsonify({'status': 'error', 'message': 'Report not found'}), 404

@app.route('/clear', methods=['POST'])
def clear():
    # Clear uploaded files and reports
    for folder in [UPLOAD_FOLDER, REPORT_FOLDER]:
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            if os.path.isfile(file_path):
                os.unlink(file_path)
    return jsonify({'status': 'success', 'message': 'Cleared all files and reports'})

if __name__ == '__main__':
    app.run(debug=True)
