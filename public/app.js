// sections
const video = document.getElementById('video');
const gallery = document.getElementById('gallery');
const files = document.getElementById('files');

// inputs
const identityInput = document.getElementById('identity');
const fileInput = document.getElementById('file-input');

// buttons
const joinRoomButton = document.getElementById('button-join');
const leaveRoomButton = document.getElementById('button-leave');
const shareFileButton = document.getElementById('file-share');

// local data track
const localDataTrack = new Twilio.Video.LocalDataTrack();

// other variables
const ROOM_NAME = 'my-video-room';
let videoRoom;

const addLocalVideo = async () =>  {
  const videoTrack = await Twilio.Video.createLocalVideoTrack();
  const localVideoDiv = document.createElement('div');
  localVideoDiv.setAttribute('id', 'localParticipant');

  const trackElement = videoTrack.attach();
  localVideoDiv.appendChild(trackElement);

  gallery.appendChild(localVideoDiv);
};

const joinRoom = async (event) => {
  event.preventDefault();

  const identity = identityInput.value;

  try {
    const response = await fetch('/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'identity': identity,
        'room': ROOM_NAME
      })
    });

    const data = await response.json();

    // Create the audio and video tracks
    const localTracks = await Twilio.Video.createLocalTracks();

    // Include the data track
    const tracks = [...localTracks, localDataTrack];

    videoRoom = await Twilio.Video.connect(data.token, {
      name: ROOM_NAME,
      tracks: tracks
    });

    console.log(`You are now connected to Room ${videoRoom.name}`);

    const localParticipant = document.getElementById('localParticipant');
    const identityDiv = document.createElement('div');
    identityDiv.setAttribute('class', 'identity');
    identityDiv.innerHTML = identity;
    localParticipant.appendChild(identityDiv);

    videoRoom.participants.forEach(participantConnected);
    videoRoom.on('participantConnected', participantConnected);
    videoRoom.on('participantDisconnected', participantDisconnected);

    joinRoomButton.disabled = true;
    leaveRoomButton.disabled = false;
    shareFileButton.disabled = false;
    identityInput.disabled = true;
  } catch (error) {
    console.log(error);
  }
}

const leaveRoom = (event) => {
  event.preventDefault();
  videoRoom.disconnect();
  console.log(`You are now disconnected from Room ${videoRoom.name}`);

  let removeParticipants = gallery.getElementsByClassName('participant');

  while (removeParticipants[0]) {
    gallery.removeChild(removeParticipants[0]);
  }

  localParticipant.removeChild(localParticipant.lastElementChild);

  joinRoomButton.disabled = false;
  leaveRoomButton.disabled = true;
  shareFileButton.disabled = true;
  identityInput.disabled = false;
}

const sendFile = async () => {
  const selectedFile = fileInput.files[0];

  // Create an array buffer from the file
  let buffer  = await selectedFile.arrayBuffer();
  localDataTrack.send(buffer);
}

const participantConnected = (participant) => {
  console.log(`${participant.identity} has joined the call.`);

  const participantDiv = document.createElement('div');
  participantDiv.setAttribute('id', participant.sid);
  participantDiv.setAttribute('class', 'participant');

  const tracksDiv = document.createElement('div');
  participantDiv.appendChild(tracksDiv);

  const identityDiv = document.createElement('div');
  identityDiv.setAttribute('class', 'identity');
  identityDiv.innerHTML = participant.identity;
  participantDiv.appendChild(identityDiv);

  gallery.appendChild(participantDiv);

  participant.tracks.forEach(publication => {
    if (publication.isSubscribed) {
      tracksDiv.appendChild(publication.track.attach());
    }
  });

  participant.on('trackSubscribed', track => {
    // Attach the video and audio tracks to the DOM
    if (track.kind === 'video' || track.kind === 'audio') {
      tracksDiv.appendChild(track.attach());
    }

    // Set up a listener for the data track
    if (track.kind === 'data') {
      // When a message is received, create a new blob from the data and download it
      track.on('message', data => {
        try {
          const blob = new Blob([data]);
          const newFileDownload = document.createElement('div');
          newFileDownload.setAttribute('class', 'file');

          const a = document.createElement('a');
          const linkText = document.createTextNode('📄');
          a.appendChild(linkText);
          a.href = window.URL.createObjectURL(blob);
          a.download = 'file'
          newFileDownload.appendChild(a);

          files.appendChild(newFileDownload);

        } catch (error) {
          console.log('Error transferring file');
          console.log(error);
        }
      });
    }
  });

  participant.on('trackUnsubscribed', track => {
    // Remove audio and video elements from the DOM
    if (track.kind === 'audio' || track.kind === 'video') {
      track.detach().forEach(element => element.remove());
    }
  });
};

const participantDisconnected = (participant) => {
  console.log(`${participant.identity} has left the call.`);
  document.getElementById(participant.sid).remove();
};

// Show the participant a preview of their video
addLocalVideo();

// Event listeners
joinRoomButton.addEventListener('click', joinRoom);
leaveRoomButton.addEventListener('click', leaveRoom);
shareFileButton.addEventListener('click', () => { sendFile()} );