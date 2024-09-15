const recordButton = document.getElementById('record');
const stopButton = document.getElementById('stop');
const audioElement = document.getElementById('audio');
const uploadForm = document.getElementById('uploadForm');
const audioDataInput = document.getElementById('audioData');
const timerDisplay = document.getElementById('timer');

let mediaRecorder;
let audioChunks = [];
let startTime;
let timerInterval;  // Declare timerInterval globally so that we can clear it when the recording stops

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

recordButton.addEventListener('click', () => {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();

      // Reset audio chunks for a new recording session
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
        // Stop the timer
        clearInterval(timerInterval);

        // Reset the timer display
        timerDisplay.textContent = '00:00';

        // Create the audio blob and upload it
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
            location.reload(); // Force refresh

            return response.text();
        })
        .then(data => {
            console.log('Audio uploaded successfully:', data);
        })
        .catch(error => {
            console.error('Error uploading audio:', error);
        });
      };

      // Disable record button and enable stop button
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

    // Re-enable record button and disable stop button
    recordButton.disabled = false;
    stopButton.disabled = true;
  }
});

// Initially disable the stop button
stopButton.disabled = true;
