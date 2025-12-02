//youtube looper prototype

let player;
let startTime = 0;
let endTime = 0;
let pauseTime = 0;
let looping = false;

function createPlayer(id) {
    player = new YT.Player('player', {
           height: '390',
           width: '640',
           videoId: id,
           playerVars: {
             'playsinline': 1
           },
           events: {
             'onReady': onPlayerReady,
             'onError': onPlayerError
           }
      });
}

function onPlayerReady(event) {
    event.target.playVideo();
}

function onPlayerError(error) {
    console.log(error);
}

function loadVideo() {
    let videoUrl = document.getElementById("videoUrl").value;
    let videoId = extractVideoId(videoUrl);
    if (!player) {
        createPlayer(videoId);
    } else {
        player.loadVideoById(videoId);
        //stop looping if we're looping while loading a new video
        if(looping) {
            toggleLoop();
        }
    }
    
}

function extractVideoId(url) {
    let videoId = url.split('v=')[1];
    let ampersandPosition = videoId.indexOf('&');
    if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
    }
    return videoId;
}


function getPlayerState() {
    let state = player.getPlayerState();

    switch (state) {
        case -1:
            return "Unstarted";
        case 0:
            return "Ended";
        case 1:
            return "Playing";
        case 2:
            return "Paused";
        case 3:
            return "Buffering";
        case 5:
            return "Video Cued";
        default:
            return "Unknown";
    }
}


function setStartTimeNow() {
    setStartTime(player.getCurrentTime());
}

function setEndTimeNow() {
    setEndTime(player.getCurrentTime());
}

function setStartTime(time) {
    if (isNaN(time)) return;
    time = time.toFixed(3);
    startTime = parseFloat(time);
    document.getElementById("startTime").value = startTime;
    player.seekTo(startTime, 1);
    player.unMute();
    playVideo();
}

function setEndTime(time) {
    if (isNaN(time)) return;
    time = time.toFixed(3);
    endTime = parseFloat(time);
    document.getElementById("endTime").value = endTime;
    player.seekTo(endTime - 1);
    player.unMute();
    playVideo();
    if (!looping) {
        setTimeout(pauseVideo, 1000);
    }
}

function setPauseTime(time) {
    if (isNaN(time)) return;
    time = time.toFixed(3);
    pauseTime = parseFloat(time);
    document.getElementById("pauseTime").value = pauseTime;
}

function toggleLoop() {
    looping = !looping;
    player.unMute();
    if (looping) {
        player.seekTo(startTime);
        playVideo();
    } else {
        player.seekTo(endTime);
        pauseVideo();
    }
}

function loop() {
    let toggleLoopButton = document.getElementById("toggleLoopButton");
    if (looping) {
        document.getElementById("player").style.border = '1px solid #ffcc00';
        if (startTime < endTime) {
            toggleLoopButton.textContent = "Stop looping";
            toggleLoopButton.style.border = "1px solid #ffcc00";
            toggleLoopButton.style.color = "#ffcc00";
            animateLoop();
        } else if (startTime === endTime) {
            toggleLoop();
            alert("Error: We're a bit puzzled by your loop - it seems to have come to a standstill with both start and end times being the same. While it's a fascinating concept, loops need a duration to function. Try setting a different start and end time to set your loop in motion.");
        } else {
            toggleLoop();
            alert("Error: Oops, looks like your loop is trying to time travel! Your loop end time seems to be set in the past, before the start time. While we love a good time travel adventure, unfortunately, loops can't end before they even begin! Please double-check your start and end times. Make sure the start time is set earlier than the end time.")
        }
    } else {
        toggleLoopButton.textContent = "Start looping";
        document.querySelector('.progress-bar').style.width = `0vw`;
        document.getElementById("player").style.border = '1px solid #c7c2c2';
        toggleLoopButton.style.border = "1px solid #c7c2c2";
        toggleLoopButton.style.color = "#c7c2c2";
    }
    window.requestAnimationFrame(loop);
}
window.requestAnimationFrame(loop);

function animateLoop() {
    let loopDuration = endTime - startTime + pauseTime;
    let progress = player.getCurrentTime() - startTime;
    if (waitingBetweenLoops(progress, loopDuration)) {
        /*
        It would make more sense to pause here, but mute was much easier to implement.
        If I pause, player.getCurrentTime() would always return the same time and progress would never continue.
        This can be worked around using performance.now() instead of video player time to keep track of time. That was the original plan,
        until I realized I could code this much quicker using the video player getCurrentTime(), because that would 
        keep the loop and animation synced with the video which would by default avoid a lot of the edge cases that would 
        otherwise come up if the user pauses, seeks, changes playback rate or simply interacts with the video during the loop. 
        I will probably implement performance.now() at some point because the current way of doing things
        creates at least one bad edge case. 
        (such as reaching the end of the video and if there is wait time then progress stops and loop doesn't restart)
        idea: 
        - when wait time is equal to (or maybe within 100ms of?) sentence length, seek to startTime and replay the video clip but muted. 
        this would allow you to repeat the sentence in sync with the video without hearing the audio from the video.
        - when wait time is different from sentence length, the best behaviour is probably to pause the video 
        and keep track of time with performance.now()
        */
        player.mute(); 
    }
    if (loopHasReachedEnd(progress, loopDuration)) {
        player.seekTo(startTime);
        player.unMute();
    }
    setProgressBarWidth(progress, loopDuration);
    setProgressBarDirection(progress, loopDuration);
}

function loopHasReachedEnd(progress, loopDuration) {
    if (progress > loopDuration) {
        return true;
    } else {
        return false;
    }
}

function waitingBetweenLoops(progress, loopDuration) {
    if (progress > (loopDuration - pauseTime) && pauseTime > 0) {
        document.querySelector('.progress-bar').style.backgroundImage = 'linear-gradient(to right, #00e2ff, #0900ff)';
        document.getElementById("player").style.border = '1px solid #00e2ff';
        toggleLoopButton.style.border = "1px solid #00e2ff";
        toggleLoopButton.style.color = "#00e2ff";
        return true;
    } else {
        document.querySelector('.progress-bar').style.backgroundImage = 'linear-gradient(to right, #ffcc00, #ff8300)';
        return false;
    }
}

function setProgressBarWidth(progress, loopDuration) {
    let fullProgressBarWidth = getFullProgressBarWidthInVw();
    let progressBarWidth;
    if (progress/loopDuration <= 0.5) { 
        //progressbar should be full width when we are halfways, therefore multiply by 2.
        progressBarWidth = 2*fullProgressBarWidth*(progress/loopDuration); 
    } else { 
        //if we are more than halfways the progressbar should start to shrink
        progressBarWidth = 2*fullProgressBarWidth*(1-(progress/loopDuration)); 
    }
    document.querySelector('.progress-bar').style.width = `${progressBarWidth}vw`;
}

function setProgressBarDirection(progress, loopDuration) {
    let progressBarContainer = document.querySelector('.progress-bar-container');
    if (progress/loopDuration <= 0.5) {
        progressBarContainer.style.writingMode = 'vertical-rl';
    } else {
        progressBarContainer.style.writingMode = 'vertical-lr';
    } 
}

function getFullProgressBarWidthInVw() {
    return 100*((parseFloat(window.getComputedStyle(document.querySelector('.progress-bar-container')).width)/window.innerWidth));
}

function pauseVideo() {
    player.pauseVideo();
}

function playVideo() {
    player.playVideo();
}




//Record and playback microphone audio live
//enable/disable with toggleMicPlayback() in console
//currently no UI because that requires reworking a lot of the UI.
let micPlayback = false;
let audioContext;
let mediaStreamSource;

function toggleMicPlayback() {
    micPlayback = !micPlayback;

    if (micPlayback) {
        // Initialize the audio context if not already initialized
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Get user media stream from the microphone
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                // Create a media stream source node
                mediaStreamSource = audioContext.createMediaStreamSource(stream);
                // Connect the microphone stream to the speakers
                mediaStreamSource.connect(audioContext.destination);
            })
            .catch(function(error) {
                console.error("Error accessing the microphone: " + error);
            });
    } else {
        // Stop the microphone stream when micPlayback is false
        if (mediaStreamSource) {
            mediaStreamSource.disconnect();
        }
    }
}







document.getElementById("endTime").addEventListener("change", function() {
    setEndTime(parseFloat(this.value));
});

document.getElementById("startTime").addEventListener("change", function() {
    setStartTime(parseFloat(this.value));
});

document.getElementById("pauseTime").addEventListener("change", function() {
    setPauseTime(parseFloat(this.value));
});

document.getElementById("setLoopStart").addEventListener("click", function() {
    setStartTimeNow();
});

document.getElementById("setLoopEnd").addEventListener("click", function() {
    setEndTimeNow();
});

document.getElementById("toggleLoopButton").addEventListener("click", function() {
    toggleLoop();
});

document.getElementById("startTimeMinusBig").addEventListener("click", function() {
    setStartTime(startTime - 5);
});

document.getElementById("startTimeMinusMedium").addEventListener("click", function() {
    setStartTime(startTime - 1);
});

document.getElementById("startTimeMinusSmall").addEventListener("click", function() {
    setStartTime(startTime - 0.1);
});

document.getElementById("startTimePlusSmall").addEventListener("click", function() {
    setStartTime(startTime + 0.1);
});

document.getElementById("startTimePlusMedium").addEventListener("click", function() {
    setStartTime(startTime + 1);
});

document.getElementById("startTimePlusBig").addEventListener("click", function() {
    setStartTime(startTime + 5);
});

document.getElementById("endTimeMinusBig").addEventListener("click", function() {
    setEndTime(endTime - 5);
});

document.getElementById("endTimeMinusMedium").addEventListener("click", function() {
    setEndTime(endTime - 1);
});

document.getElementById("endTimeMinusSmall").addEventListener("click", function() {
    setEndTime(endTime - 0.1);
});

document.getElementById("endTimePlusSmall").addEventListener("click", function() {
    setEndTime(endTime + 0.1);
});

document.getElementById("endTimePlusMedium").addEventListener("click", function() {
    setEndTime(endTime + 1);
});

document.getElementById("endTimePlusBig").addEventListener("click", function() {
    setEndTime(endTime + 5);
});

document.getElementById("setPauseTimeBtn").addEventListener("click", function() {
    setPauseTime((endTime - startTime));
});
