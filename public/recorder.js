const startRecordingButton = document.getElementById('startRecording');
const stopRecordingButton = document.getElementById('stopRecording');
const recordedVideo = document.getElementById('recordedVideo');
const downloadRecordingButton = document.getElementById('downloadRecording');

let mediaRecorder;
let recordedChunks = [];

startRecordingButton.onclick = async () => {
    console.log('started recording')
  // Get the screen stream
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

  // Get the audio stream from the microphone
  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Combine the screen and audio streams
  const combinedStream = new MediaStream([
    ...screenStream.getVideoTracks(),
    ...audioStream.getAudioTracks()
  ]);

  mediaRecorder = new MediaRecorder(combinedStream);

  mediaRecorder.ondataavailable = event => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    recordedVideo.src = url;
    recordedVideo.style.display = 'block';
    downloadRecordingButton.style.display = 'block';

    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'recording.webm';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Upload the recorded video to the server
    const formData = new FormData();
    formData.append('video', blob);

    fetch('/api/upload-recording', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      console.log('Recording uploaded successfully', data);
    })
    .catch(error => {
      console.error('Error uploading recording', error);
    });
  };

  mediaRecorder.start();
};

stopRecordingButton.onclick = () => {
  mediaRecorder.stop();
};
