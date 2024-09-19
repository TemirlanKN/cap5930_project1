from datetime import datetime

from flask import Flask, render_template, request, redirect, url_for, send_file, send_from_directory, jsonify
from werkzeug.utils import secure_filename
from google.cloud import speech
from google.cloud import texttospeech_v1 as texttospeech
import os
import json
from google.cloud import secretmanager

def get_secret(secret_id, version_id="latest"):
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/cap5930-project-1/secrets/cap5930-project-1-service-account-key/versions/{version_id}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")
service_account_key = get_secret("service-account-key")
credentials = json.loads(service_account_key)
client = speech.SpeechClient.from_service_account_info(credentials)

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'wav'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_files():
    files = []
    for filename in os.listdir(UPLOAD_FOLDER):
        if allowed_file(filename):
            files.append(filename)
            print(filename)
    files.sort(reverse=True)
    return files

@app.route('/')
def index():
    files = get_files()
    return render_template('index.html', files=files)

client = speech.SpeechClient()

def sample_recognize(file_path):
    with open(file_path, 'rb') as audio_file:
        content = audio_file.read()

    audio = speech.RecognitionAudio(content=content)
    config = speech.RecognitionConfig(
        language_code="en-US",
        model="latest_long",
        # audio_channel_count=2,
        enable_word_confidence=True,
        enable_word_time_offsets=True,
    )

    operation = client.long_running_recognize(config=config, audio=audio)
    response = operation.result(timeout=90)

    transcript = ''
    for result in response.results:
        transcript += result.alternatives[0].transcript + '\n'
    
    return transcript

@app.route('/upload', methods=['POST'])
def upload_audio():
    if 'audio_data' not in request.files:
        flash('No audio data')
        return redirect(request.url)
    file = request.files['audio_data']
    if file.filename == '':
        flash('No selected file')
        return redirect(request.url)
    if file:
        filename = datetime.now().strftime("%Y%m%d-%I%M%S%p") + '_stt.wav'
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        print(f"Saving WAV file to: {file_path}")
        
        file.save(file_path)

        transcript = sample_recognize(file_path)
        
        transcript_filename = os.path.splitext(filename)[0] + '.txt'
        transcript_path = os.path.join(app.config['UPLOAD_FOLDER'], transcript_filename)
        
        print(f"Saving transcript file to: {transcript_path}")
        with open(transcript_path, 'w') as f:
            f.write(transcript)

    return redirect('/') #success

@app.route('/upload/<filename>')
def get_file(filename):
    return send_file(filename)

tts_client = texttospeech.TextToSpeechClient()

def sample_synthesize_speech(text=None):
    input = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Wavenet-D"
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.LINEAR16 
    )

    response = tts_client.synthesize_speech(
        input=input, voice=voice, audio_config=audio_config
    )
    return response.audio_content
    
@app.route('/upload_text', methods=['POST'])
def upload_text():
    text = request.form['text']
    print("upload text",text)
     
    synthesized_speech = sample_synthesize_speech(text=text)

    filename = datetime.now().strftime("%Y%m%d-%I%M%S%p") + '_tts.wav'
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(file_path, 'wb') as f:
        f.write(synthesized_speech)

    transcript_filename = os.path.splitext(filename)[0] + '.txt'
    transcript_path = os.path.join(app.config['UPLOAD_FOLDER'], transcript_filename)
    with open(transcript_path, 'w') as f:
        f.write(text)

    return jsonify({'file': filename, 'transcript': transcript_filename})

@app.route('/script.js',methods=['GET'])
def scripts_js():
    return send_file('./script.js')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)