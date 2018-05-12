import os

from flask import render_template, session, send_from_directory

from . import app

@app.route('/')
def route_index():
    return render_template('index.html')

@app.route('/favicon.ico')
def route_favicon():
    directory = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'static/favicon')
    return send_from_directory(directory, 'favicon.ico')

@app.route('/<path:path>')
def route_html(path):
    if path == '':
        path = 'index.html'
    return render_template(path)