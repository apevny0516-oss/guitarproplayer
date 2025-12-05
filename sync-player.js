/**
 * Synced Player
 * Plays Guitar Pro tabs synced with real audio recordings
 */

class SyncedPlayer {
    constructor() {
        this.alphaTab = null;
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.gainNode = null;
        
        this.score = null;
        this.syncData = null;
        this.gpFile = null;
        this.audioFile = null;
        
        // Playback state
        this.isPlaying = false;
        this.isLooping = false;
        this.currentTime = 0;
        this.duration = 0;
        this.playbackRate = 1.0;
        this.volume = 0.8;
        this.startedAt = 0;
        this.pausedAt = 0;
        
        // Animation frame for updates
        this.animationFrame = null;
        
        // Current bar tracking
        this.currentBar = 0;
        this.totalBars = 0;
        
        // Tick cache for cursor positioning
        this.barTickMap = []; // Maps bar number to {startTick, endTick}
        
        // DOM Elements
        this.elements = {
            // File inputs
            syncFileInput: document.getElementById('syncFileInput'),
            gpFileInput: document.getElementById('gpFileInput'),
            audioFileInput: document.getElementById('audioFileInput'),
            
            // Track info
            trackTitle: document.getElementById('trackTitle'),
            trackArtist: document.getElementById('trackArtist'),
            trackList: document.getElementById('trackList'),
            
            // Audio files section
            audioFilesSection: document.getElementById('audioFilesSection'),
            gpFileStatus: document.getElementById('gpFileStatus'),
            audioFileStatus: document.getElementById('audioFileStatus'),
            gpFileName: document.getElementById('gpFileName'),
            audioFileName: document.getElementById('audioFileName'),
            
            // Notation
            alphaTabContainer: document.getElementById('alphaTab'),
            welcomeScreen: document.getElementById('welcomeScreen'),
            
            // Bar indicator
            currentBar: document.getElementById('currentBar'),
            totalBars: document.getElementById('totalBars'),
            
            // Playback controls
            playPauseBtn: document.getElementById('playPauseBtn'),
            stopBtn: document.getElementById('stopBtn'),
            prevBarBtn: document.getElementById('prevBarBtn'),
            nextBarBtn: document.getElementById('nextBarBtn'),
            loopBtn: document.getElementById('loopBtn'),
            
            // Time & progress
            currentTime: document.getElementById('currentTime'),
            totalTime: document.getElementById('totalTime'),
            progressFill: document.getElementById('progressFill'),
            progressCursor: document.getElementById('progressCursor'),
            progressBar: document.getElementById('progressBar'),
            barMarkers: document.getElementById('barMarkers'),
            
            // Volume & tempo
            tempoSlider: document.getElementById('tempoSlider'),
            tempoValue: document.getElementById('tempoValue'),
            volumeSlider: document.getElementById('volumeSlider'),
            
            // Badge
            audioSourceBadge: document.getElementById('audioSourceBadge'),
            
            // Loading
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingText: document.getElementById('loadingText')
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        // File inputs
        this.elements.syncFileInput.addEventListener('change', (e) => {
            this.loadSyncFile(e.target.files[0]);
        });
        
        this.elements.gpFileInput.addEventListener('change', (e) => {
            this.loadGPFile(e.target.files[0]);
        });
        
        this.elements.audioFileInput.addEventListener('change', (e) => {
            this.loadAudioFile(e.target.files[0]);
        });
        
        // Playback controls
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.stopBtn.addEventListener('click', () => this.stop());
        this.elements.prevBarBtn.addEventListener('click', () => this.previousBar());
        this.elements.nextBarBtn.addEventListener('click', () => this.nextBar());
        this.elements.loopBtn.addEventListener('click', () => this.toggleLoop());
        
        // Tempo slider
        this.elements.tempoSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.playbackRate = value / 100;
            this.elements.tempoValue.textContent = `${value}%`;
            
            if (this.audioSource) {
                this.audioSource.playbackRate.value = this.playbackRate;
            }
        });
        
        // Volume slider
        this.elements.volumeSlider.addEventListener('input', (e) => {
            this.volume = parseInt(e.target.value) / 100;
            if (this.gainNode) {
                this.gainNode.gain.value = this.volume;
            }
        });
        
        // Progress bar seeking
        this.elements.progressBar.addEventListener('click', (e) => {
            if (this.duration === 0) return;
            const rect = this.elements.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seekTo(percent * this.duration);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'Escape':
                    this.stop();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousBar();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextBar();
                    break;
                case 'KeyL':
                    this.toggleLoop();
                    break;
            }
        });
    }
    
    // ==========================================
    // File Loading
    // ==========================================
    
    loadSyncFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.syncData = JSON.parse(e.target.result);
                this.onSyncDataLoaded();
            } catch (err) {
                alert('Invalid sync file format');
            }
        };
        reader.readAsText(file);
    }
    
    onSyncDataLoaded() {
        this.elements.trackTitle.textContent = this.syncData.title || 'Untitled';
        this.elements.trackArtist.textContent = this.syncData.artist || 'Unknown Artist';
        
        document.title = `${this.syncData.title || 'Untitled'} - TabPlayer`;
        
        this.elements.audioFilesSection.style.display = 'block';
        this.elements.gpFileName.textContent = this.syncData.gpFile || 'Select file...';
        this.elements.audioFileName.textContent = this.syncData.audioFile || 'Select file...';
        
        this.totalBars = this.syncData.totalBars || 0;
        this.elements.totalBars.textContent = this.totalBars;
        
        this.elements.welcomeScreen.style.display = 'none';
    }
    
    loadGPFile(file) {
        if (!file) return;
        
        this.gpFile = file;
        this.showLoading('Loading Guitar Pro file...');
        
        this.elements.gpFileName.textContent = file.name;
        this.elements.gpFileStatus.classList.add('loaded');
        this.elements.gpFileStatus.querySelector('.file-icon').classList.remove('pending');
        this.elements.gpFileStatus.querySelector('.file-icon').classList.add('loaded');
        
        if (!this.alphaTab) {
            this.initAlphaTab();
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            this.alphaTab.load(data);
        };
        reader.onerror = () => {
            this.hideLoading();
            alert('Failed to load Guitar Pro file');
        };
        reader.readAsArrayBuffer(file);
    }
    
    loadAudioFile(file) {
        if (!file) return;
        
        this.audioFile = file;
        this.showLoading('Loading audio file...');
        
        this.elements.audioFileName.textContent = file.name;
        this.elements.audioFileStatus.classList.add('loaded');
        this.elements.audioFileStatus.querySelector('.file-icon').classList.remove('pending');
        this.elements.audioFileStatus.querySelector('.file-icon').classList.add('loaded');
        
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = this.volume;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.audioContext.decodeAudioData(e.target.result, (buffer) => {
                this.audioBuffer = buffer;
                this.duration = buffer.duration;
                this.elements.totalTime.textContent = this.formatTime(this.duration);
                this.elements.audioSourceBadge.classList.add('visible');
                this.hideLoading();
                this.checkReadyToPlay();
            }, (err) => {
                this.hideLoading();
                alert('Failed to decode audio file');
            });
        };
        reader.readAsArrayBuffer(file);
    }
    
    initAlphaTab() {
        const settings = {
            core: {
                fontDirectory: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/',
                file: null,
                tracks: 'all'
            },
            display: {
                staveProfile: 'Default',
                layoutMode: 'Page',
                scale: 1.0,
                stretchForce: 0.8,
                resources: {
                    staffLineColor: '#3d4450',
                    barSeparatorColor: '#3d4450',
                    mainGlyphColor: '#e6edf3',
                    secondaryGlyphColor: '#8b949e',
                    scoreInfoColor: '#e6edf3',
                    barNumberColor: '#8b949e'
                }
            },
            notation: {
                elements: {
                    scoreTitle: true,
                    scoreSubTitle: true,
                    scoreArtist: true,
                    scoreAlbum: true,
                    scoreWords: true,
                    scoreMusic: true,
                    scoreCopyright: true,
                    guitarTuning: true
                }
            },
            player: {
                enablePlayer: true,
                enableCursor: true,
                enableUserInteraction: true,
                scrollElement: this.elements.alphaTabContainer,
                scrollMode: 'Continuous',
                // Load soundfont but we'll mute it
                soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2'
            }
        };
        
        this.alphaTab = new alphaTab.AlphaTabApi(this.elements.alphaTabContainer, settings);
        
        this.alphaTab.scoreLoaded.on((score) => {
            this.onScoreLoaded(score);
        });
        
        this.alphaTab.playerReady.on(() => {
            // Mute the alphaTab player - we only want the cursor, not its audio
            this.alphaTab.masterVolume = 0;
            this.alphaTab.metronomeVolume = 0;
            this.buildBarTickMap();
            this.checkReadyToPlay();
        });
        
        this.alphaTab.renderStarted.on(() => {
            this.showLoading('Rendering notation...');
        });
        
        this.alphaTab.renderFinished.on(() => {
            this.hideLoading();
            this.renderBarMarkers();
            // Build tick map if player is already ready
            if (this.alphaTab.isReadyForPlayback) {
                this.buildBarTickMap();
            }
        });
    }
    
    onScoreLoaded(score) {
        this.score = score;
        this.totalBars = score.masterBars.length;
        this.elements.totalBars.textContent = this.totalBars;
        
        this.populateTrackList(score.tracks);
        this.checkReadyToPlay();
    }
    
    buildBarTickMap() {
        // Build a mapping from bar numbers to tick positions
        this.barTickMap = [];
        
        if (!this.alphaTab || !this.alphaTab.tickCache) return;
        
        const tickCache = this.alphaTab.tickCache;
        if (tickCache.masterBars) {
            tickCache.masterBars.forEach((barInfo, index) => {
                this.barTickMap[index + 1] = {
                    start: barInfo.start,
                    end: barInfo.end
                };
            });
        }
    }
    
    populateTrackList(tracks) {
        this.elements.trackList.innerHTML = '';
        
        const colors = [
            '#00d4aa', '#ff6b6b', '#4ecdc4', '#ffe66d', 
            '#a29bfe', '#fd79a8', '#fdcb6e', '#74b9ff',
            '#55efc4', '#fab1a0', '#81ecec', '#dfe6e9'
        ];
        
        tracks.forEach((track, index) => {
            const trackEl = document.createElement('div');
            trackEl.className = 'track-item';
            trackEl.dataset.index = index;
            
            const color = colors[index % colors.length];
            
            trackEl.innerHTML = `
                <div class="track-color" style="background: ${color}"></div>
                <div class="track-details">
                    <div class="track-name">${track.name || `Track ${index + 1}`}</div>
                    <div class="track-instrument">${this.getInstrumentName(track)}</div>
                </div>
            `;
            
            trackEl.addEventListener('click', () => {
                this.selectTrack(index);
            });
            
            this.elements.trackList.appendChild(trackEl);
        });
        
        if (tracks.length > 0) {
            this.selectTrack(0);
        }
    }
    
    getInstrumentName(track) {
        if (track.staves && track.staves.length > 0) {
            const staff = track.staves[0];
            if (staff.isPercussion) return 'Drums';
            if (staff.stringTuning && staff.stringTuning.tunings) {
                const stringCount = staff.stringTuning.tunings.length;
                if (stringCount === 4) return 'Bass';
                if (stringCount === 6) return 'Guitar';
                if (stringCount === 7) return '7-String Guitar';
                return `${stringCount}-String`;
            }
        }
        return 'Instrument';
    }
    
    selectTrack(index) {
        const items = this.elements.trackList.querySelectorAll('.track-item');
        items.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        
        this.alphaTab.renderTracks([this.score.tracks[index]]);
    }
    
    checkReadyToPlay() {
        const hasSync = this.syncData && this.syncData.markers && this.syncData.markers.length > 0;
        const hasGP = this.score !== null;
        const hasAudio = this.audioBuffer !== null;
        
        // Enable playback if we have all required files
        // The tick map will be built async when player is ready
        if (hasSync && hasGP && hasAudio) {
            this.enablePlaybackControls(true);
        }
    }
    
    enablePlaybackControls(enabled) {
        this.elements.playPauseBtn.disabled = !enabled;
        this.elements.stopBtn.disabled = !enabled;
        this.elements.prevBarBtn.disabled = !enabled;
        this.elements.nextBarBtn.disabled = !enabled;
        this.elements.loopBtn.disabled = !enabled;
    }
    
    // ==========================================
    // Progress Bar Markers
    // ==========================================
    
    renderBarMarkers() {
        this.elements.barMarkers.innerHTML = '';
        
        if (!this.syncData || !this.syncData.markers || this.duration === 0) return;
        
        this.syncData.markers.forEach((marker) => {
            const percent = (marker.time / this.duration) * 100;
            const line = document.createElement('div');
            line.className = 'bar-marker-line';
            line.style.left = `${percent}%`;
            line.dataset.bar = marker.bar;
            this.elements.barMarkers.appendChild(line);
        });
    }
    
    // ==========================================
    // Playback Control
    // ==========================================
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        if (!this.audioBuffer) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;
        this.audioSource.playbackRate.value = this.playbackRate;
        this.audioSource.connect(this.gainNode);
        
        this.audioSource.onended = () => {
            if (this.isPlaying) {
                if (this.isLooping) {
                    this.seekTo(0);
                    this.play();
                } else {
                    this.stop();
                }
            }
        };
        
        const offset = this.pausedAt;
        this.startedAt = this.audioContext.currentTime - offset / this.playbackRate;
        this.audioSource.start(0, offset);
        
        this.isPlaying = true;
        this.updatePlayButton();
        this.startUpdateLoop();
    }
    
    pause() {
        if (!this.isPlaying) return;
        
        this.pausedAt = (this.audioContext.currentTime - this.startedAt) * this.playbackRate;
        
        if (this.audioSource) {
            this.audioSource.onended = null;
            this.audioSource.stop();
            this.audioSource = null;
        }
        
        this.isPlaying = false;
        this.updatePlayButton();
        this.stopUpdateLoop();
    }
    
    stop() {
        this.pause();
        this.pausedAt = 0;
        this.currentTime = 0;
        this.currentBar = 0;
        this.updateProgress();
        this.updateCursor();
        this.elements.currentBar.textContent = '1';
    }
    
    seekTo(time) {
        const wasPlaying = this.isPlaying;
        
        if (wasPlaying) {
            this.pause();
        }
        
        this.pausedAt = Math.max(0, Math.min(time, this.duration));
        this.currentTime = this.pausedAt;
        this.updateProgress();
        this.updateCursor();
        
        if (wasPlaying) {
            this.play();
        }
    }
    
    previousBar() {
        if (!this.syncData || !this.syncData.markers) return;
        
        let targetTime = 0;
        for (let i = this.syncData.markers.length - 1; i >= 0; i--) {
            if (this.syncData.markers[i].time < this.currentTime - 0.1) {
                targetTime = this.syncData.markers[i].time;
                break;
            }
        }
        
        this.seekTo(targetTime);
    }
    
    nextBar() {
        if (!this.syncData || !this.syncData.markers) return;
        
        for (const marker of this.syncData.markers) {
            if (marker.time > this.currentTime + 0.1) {
                this.seekTo(marker.time);
                return;
            }
        }
    }
    
    toggleLoop() {
        this.isLooping = !this.isLooping;
        this.elements.loopBtn.classList.toggle('active', this.isLooping);
    }
    
    // ==========================================
    // Update Loop
    // ==========================================
    
    startUpdateLoop() {
        const update = () => {
            if (!this.isPlaying) return;
            
            this.currentTime = (this.audioContext.currentTime - this.startedAt) * this.playbackRate;
            
            if (this.currentTime >= this.duration) {
                this.currentTime = this.duration;
            }
            
            this.updateProgress();
            this.updateCursor();
            
            this.animationFrame = requestAnimationFrame(update);
        };
        
        this.animationFrame = requestAnimationFrame(update);
    }
    
    stopUpdateLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    updateProgress() {
        this.elements.currentTime.textContent = this.formatTime(this.currentTime);
        
        const percent = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressCursor.style.left = `${percent}%`;
    }
    
    updateCursor() {
        if (!this.syncData || !this.syncData.markers) return;
        
        // Find current bar and the next bar based on audio time
        let currentBarIndex = 0;
        let currentBarTime = 0;
        let nextBarTime = this.duration;
        
        for (let i = 0; i < this.syncData.markers.length; i++) {
            const marker = this.syncData.markers[i];
            if (this.currentTime >= marker.time) {
                currentBarIndex = i;
                currentBarTime = marker.time;
                // Get next bar time
                if (i + 1 < this.syncData.markers.length) {
                    nextBarTime = this.syncData.markers[i + 1].time;
                } else {
                    nextBarTime = this.duration;
                }
            } else {
                break;
            }
        }
        
        const currentMarker = this.syncData.markers[currentBarIndex];
        if (!currentMarker) return;
        
        const barNumber = currentMarker.bar;
        
        // Update bar indicator
        if (barNumber !== this.currentBar) {
            this.currentBar = barNumber;
            this.elements.currentBar.textContent = barNumber;
        }
        
        // Only update alphaTab cursor if tick map is ready
        if (this.barTickMap.length === 0) return;
        
        // Calculate interpolated tick position within the current bar
        const barTicks = this.barTickMap[barNumber];
        if (!barTicks) return;
        
        // How far through this bar are we (0 to 1)?
        const barDuration = nextBarTime - currentBarTime;
        const timeInBar = this.currentTime - currentBarTime;
        const barProgress = barDuration > 0 ? Math.min(1, Math.max(0, timeInBar / barDuration)) : 0;
        
        // Interpolate tick position
        const tickRange = barTicks.end - barTicks.start;
        const currentTick = Math.floor(barTicks.start + (tickRange * barProgress));
        
        // Update alphaTab cursor position
        try {
            this.alphaTab.tickPosition = currentTick;
        } catch (e) {
            // Ignore errors
        }
    }
    
    updatePlayButton() {
        const playIcon = this.elements.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.elements.playPauseBtn.querySelector('.pause-icon');
        
        playIcon.style.display = this.isPlaying ? 'none' : 'block';
        pauseIcon.style.display = this.isPlaying ? 'block' : 'none';
    }
    
    // ==========================================
    // Utility Functions
    // ==========================================
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    showLoading(text = 'Loading...') {
        this.elements.loadingText.textContent = text;
        this.elements.loadingOverlay.classList.add('visible');
    }
    
    hideLoading() {
        this.elements.loadingOverlay.classList.remove('visible');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.syncedPlayer = new SyncedPlayer();
});
