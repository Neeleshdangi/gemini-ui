import os
import logging
from flask import Flask, render_template, Response

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")

# Add hardware access permission headers
@app.after_request
def add_header(response):
    response.headers['Permissions-Policy'] = 'camera=*, microphone=*, display-capture=*'
    response.headers['Feature-Policy'] = 'camera *; microphone *; display-capture *'
    return response

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
