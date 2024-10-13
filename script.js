const recordButton = document.getElementById('record');
const stopButton = document.getElementById('stop');
const audioElement = document.getElementById('audio');
const uploadForm = document.getElementById('uploadForm');
const audioDataInput = document.getElementById('audioData');
const timerDisplay = document.getElementById('timer');

let mediaRecorder;
let audioChunks = [];
let startTime;
let timerInterval;

function formatTime(time) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showSection(sectionId) {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => section.classList.remove('active'));

  const selectedSection = document.getElementById(sectionId);
  selectedSection.classList.add('active');
}

document.getElementById('generateAudioButton').addEventListener('click', function () {
  const text = document.getElementById('textInput').value;

  if (text.trim() === "") {
      alert("Please enter some text.");
      return;
  }

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload_text', true);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
          const audioList = document.getElementById('synthesizedAudioList');
          const response = JSON.parse(xhr.responseText);
          const newListItem = document.createElement('li');
          newListItem.innerHTML = `
              <audio controls>
                  <source src="/uploads/${response.file}">
                  Your browser does not support the audio element.
              </audio>
              <br>${response.file}
              <a href="/uploads/${response.transcript}">Transcript: ${response.transcript}</a>
              <br>
              <p>Sentiment Analysis:${response.sentiment_content}</p>
          `;
          audioList.appendChild(newListItem);
      }
  };

  const params = "text=" + encodeURIComponent(text);
  xhr.send(params);
});

recordButton.addEventListener('click', () => {
  navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.start();

          audioChunks = [];

          startTime = Date.now();
          timerInterval = setInterval(() => {
              const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
              timerDisplay.textContent = formatTime(elapsedTime);
          }, 1000);

          mediaRecorder.ondataavailable = e => {
              audioChunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
              clearInterval(timerInterval);
              timerDisplay.textContent = '00:00';

              const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
              const formData = new FormData();
              formData.append('audio_data', audioBlob, 'recorded_audio.wav');

              fetch('/upload', {
                  method: 'POST',
                  body: formData
              })
              .then(response => {
                  if (!response.ok) {
                      throw new Error('Network response was not ok');
                  }
                  return response.json();
              })
              .then(data => {
                  const audioList = document.getElementById('recordedFiles');
                  const newListItem = document.createElement('li');
                  newListItem.innerHTML = `
                      <audio controls>
                          <source src="/uploads/${data.file}">
                          Your browser does not support the audio element.
                      </audio>
                      <br>${data.file}
                      <a href="/uploads/${data.transcript}">Transcript: ${data.transcript}</a>
                      <br>
                      <p>Sentiment Analysis:${data.sentiment_content}</p>
                  `;
                  audioList.appendChild(newListItem);
              })
              .catch(error => {
                  console.error('Error uploading audio:', error);
              });
          };

          recordButton.disabled = true;
          stopButton.disabled = false;
      })
      .catch(error => {
          console.error('Error accessing microphone:', error);
      });
});

stopButton.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      recordButton.disabled = false;
      stopButton.disabled = true;
  }
});

stopButton.disabled = true;
