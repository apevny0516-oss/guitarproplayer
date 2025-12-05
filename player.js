/**
 * Guitar Pro Tab Player
 * A web-based player for Guitar Pro notation files using alphaTab
 */

class TabPlayer {
    constructor() {
        this.api = null;
        this.isPlaying = false;
        this.isLooping = false;
        this.isMetronomeEnabled = true;
        this.currentScore = null;
        this.hasSelection = false;
        this.selectionStartBeat = null;
        this.selectionEndBeat = null;
        
        // DOM Elements
        this.elements = {
            container: document.getElementById('alphaTab'),
            welcomeScreen: document.getElementById('welcomeScreen'),
            fileInput: document.getElementById('fileInput'),
            trackTitle: document.getElementById('trackTitle'),
            trackArtist: document.getElementById('trackArtist'),
            trackList: document.getElementById('trackList'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            stopBtn: document.getElementById('stopBtn'),
            loopBtn: document.getElementById('loopBtn'),
            metronomeBtn: document.getElementById('metronomeBtn'),
            tempoSlider: document.getElementById('tempoSlider'),
            tempoValue: document.getElementById('tempoValue'),
            volumeSlider: document.getElementById('volumeSlider'),
            currentTime: document.getElementById('currentTime'),
            totalTime: document.getElementById('totalTime'),
            progressFill: document.getElementById('progressFill'),
            progressCursor: document.getElementById('progressCursor'),
            progressBar: document.getElementById('progressBar'),
            loadingOverlay: document.getElementById('loadingOverlay')
        };
        
        this.init();
    }
    
    init() {
        this.initAlphaTab();
        this.bindEvents();
    }
    
    initAlphaTab() {
        // AlphaTab settings
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
                soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2',
                scrollElement: this.elements.container,
                scrollMode: 'Continuous'
            }
        };
        
        // Initialize alphaTab
        this.api = new alphaTab.AlphaTabApi(this.elements.container, settings);
        
        // Set up event handlers
        this.api.scoreLoaded.on((score) => {
            this.onScoreLoaded(score);
        });
        
        this.api.playerReady.on(() => {
            this.hideLoading();
            // Enable metronome by default
            this.api.metronomeVolume = 1;
            this.elements.metronomeBtn.classList.add('active');
        });
        
        this.api.playerStateChanged.on((args) => {
            this.onPlayerStateChanged(args);
        });
        
        this.api.playerPositionChanged.on((args) => {
            this.onPositionChanged(args);
        });
        
        this.api.renderStarted.on(() => {
            this.showLoading();
        });
        
        this.api.renderFinished.on(() => {
            this.hideLoading();
        });
        
        // Listen for beat/bar selection changes
        this.api.playbackRangeChanged.on((args) => {
            this.onPlaybackRangeChanged(args);
        });
    }
    
    bindEvents() {
        // File input
        this.elements.fileInput.addEventListener('change', (e) => {
            this.loadFile(e.target.files[0]);
        });
        
        // Playback controls
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.stopBtn.addEventListener('click', () => this.stop());
        this.elements.loopBtn.addEventListener('click', () => this.toggleLoop());
        this.elements.metronomeBtn.addEventListener('click', () => this.toggleMetronome());
        
        // Tempo slider
        this.elements.tempoSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.elements.tempoValue.textContent = `${value}%`;
            this.api.playbackSpeed = value / 100;
        });
        
        // Volume slider
        this.elements.volumeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.api.masterVolume = value / 100;
        });
        
        // Progress bar click
        this.elements.progressBar.addEventListener('click', (e) => {
            if (!this.currentScore) return;
            const rect = this.elements.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const tick = Math.floor(this.api.tickCache.masterBars[this.api.tickCache.masterBars.length - 1].end * percent);
            this.api.tickPosition = tick;
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
                    // Clear selection if there is one, otherwise stop
                    if (this.hasSelection) {
                        this.clearSelection();
                    } else {
                        this.stop();
                    }
                    break;
                case 'KeyL':
                    this.toggleLoop();
                    break;
                case 'KeyM':
                    this.toggleMetronome();
                    break;
                case 'KeyC':
                    // Clear loop selection
                    if (this.hasSelection) {
                        this.clearSelection();
                    }
                    break;
            }
        });
        
        // Drag and drop
        this.elements.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.elements.container.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
                this.loadFile(file);
            }
        });
    }
    
    loadFile(file) {
        if (!file) return;
        
        this.showLoading();
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            this.api.load(data);
        };
        reader.onerror = () => {
            this.hideLoading();
            alert('Failed to load file');
        };
        reader.readAsArrayBuffer(file);
    }
    
    onScoreLoaded(score) {
        this.currentScore = score;
        
        // Hide welcome screen
        this.elements.welcomeScreen.style.display = 'none';
        
        // Update track info
        this.elements.trackTitle.textContent = score.title || 'Untitled';
        this.elements.trackArtist.textContent = score.artist || 'Unknown Artist';
        
        // Update document title
        document.title = `${score.title || 'Untitled'} - TabPlayer`;
        
        // Populate track list
        this.populateTrackList(score.tracks);
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
                <div class="track-controls">
                    <button class="track-btn solo-btn" title="Solo" data-index="${index}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="22"/>
                        </svg>
                    </button>
                    <button class="track-btn mute-btn" title="Mute" data-index="${index}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>
                            <line x1="23" y1="9" x2="17" y2="15"/>
                            <line x1="17" y1="9" x2="23" y2="15"/>
                        </svg>
                    </button>
                </div>
            `;
            
            // Track selection
            trackEl.addEventListener('click', (e) => {
                if (e.target.closest('.track-btn')) return;
                this.selectTrack(index);
            });
            
            // Solo button
            const soloBtn = trackEl.querySelector('.solo-btn');
            soloBtn.addEventListener('click', () => {
                this.toggleSolo(index);
            });
            
            // Mute button
            const muteBtn = trackEl.querySelector('.mute-btn');
            muteBtn.addEventListener('click', () => {
                this.toggleMute(index);
            });
            
            this.elements.trackList.appendChild(trackEl);
        });
        
        // Select first track by default
        if (tracks.length > 0) {
            this.selectTrack(0);
        }
    }
    
    getInstrumentName(track) {
        if (track.staves && track.staves.length > 0) {
            const staff = track.staves[0];
            if (staff.isPercussion) {
                return 'Drums';
            }
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
        // Update UI
        const items = this.elements.trackList.querySelectorAll('.track-item');
        items.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        
        // Update alphaTab to show selected track
        this.api.renderTracks([this.currentScore.tracks[index]]);
    }
    
    toggleMute(index) {
        const track = this.currentScore.tracks[index];
        const trackItem = this.elements.trackList.querySelector(`[data-index="${index}"]`);
        const muteBtn = trackItem.querySelector('.mute-btn');
        
        if (this.api.trackMute(track)) {
            this.api.changeTrackMute([track], false);
            muteBtn.classList.remove('active');
            trackItem.classList.remove('muted');
        } else {
            this.api.changeTrackMute([track], true);
            muteBtn.classList.add('active');
            trackItem.classList.add('muted');
        }
    }
    
    toggleSolo(index) {
        const track = this.currentScore.tracks[index];
        const trackItem = this.elements.trackList.querySelector(`[data-index="${index}"]`);
        const soloBtn = trackItem.querySelector('.solo-btn');
        
        if (this.api.trackSolo(track)) {
            this.api.changeTrackSolo([track], false);
            soloBtn.classList.remove('active');
        } else {
            this.api.changeTrackSolo([track], true);
            soloBtn.classList.add('active');
        }
    }
    
    togglePlayPause() {
        if (!this.currentScore) return;
        this.api.playPause();
    }
    
    stop() {
        if (!this.currentScore) return;
        this.api.stop();
        this.updatePlayButton(false);
    }
    
    toggleLoop() {
        this.isLooping = !this.isLooping;
        this.api.isLooping = this.isLooping;
        this.elements.loopBtn.classList.toggle('active', this.isLooping);
        
        // If turning off loop and we have a selection, clear it
        if (!this.isLooping && this.hasSelection) {
            this.clearSelection();
        }
    }
    
    onPlaybackRangeChanged(args) {
        // Check if we have a valid selection range
        if (args.playbackRange && args.playbackRange.startTick >= 0 && args.playbackRange.endTick > args.playbackRange.startTick) {
            this.hasSelection = true;
            
            // Automatically enable looping when a selection is made
            if (!this.isLooping) {
                this.isLooping = true;
                this.api.isLooping = true;
                this.elements.loopBtn.classList.add('active');
            }
            
            // Update loop indicator text
            this.updateLoopIndicator(args.playbackRange);
        } else {
            this.hasSelection = false;
        }
    }
    
    updateLoopIndicator(range) {
        // Show a toast notification about the loop selection
        this.showLoopNotification(range);
    }
    
    showLoopNotification(range) {
        // Remove existing notification if present
        const existing = document.querySelector('.loop-notification');
        if (existing) existing.remove();
        
        // Calculate bar numbers from tick positions
        let startBar = 1;
        let endBar = 1;
        
        if (this.api.tickCache && this.api.tickCache.masterBars) {
            const masterBars = this.api.tickCache.masterBars;
            for (let i = 0; i < masterBars.length; i++) {
                const bar = masterBars[i];
                if (bar.start <= range.startTick) startBar = i + 1;
                if (bar.start <= range.endTick) endBar = i + 1;
            }
        }
        
        const notification = document.createElement('div');
        notification.className = 'loop-notification';
        notification.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17,1 21,5 17,9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7,23 3,19 7,15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <span>Loop: Bar ${startBar} → Bar ${endBar}</span>
            <button class="clear-loop-btn" title="Clear selection">✕</button>
        `;
        
        document.body.appendChild(notification);
        
        // Add click handler to clear button
        notification.querySelector('.clear-loop-btn').addEventListener('click', () => {
            this.clearSelection();
        });
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('visible');
        });
    }
    
    clearSelection() {
        // Clear the playback range (reset to full song)
        this.api.playbackRange = null;
        this.hasSelection = false;
        
        // Remove notification
        const notification = document.querySelector('.loop-notification');
        if (notification) {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 300);
        }
        
        // Optionally disable looping
        this.isLooping = false;
        this.api.isLooping = false;
        this.elements.loopBtn.classList.remove('active');
    }
    
    toggleMetronome() {
        this.isMetronomeEnabled = !this.isMetronomeEnabled;
        this.api.metronomeVolume = this.isMetronomeEnabled ? 1 : 0;
        this.elements.metronomeBtn.classList.toggle('active', this.isMetronomeEnabled);
    }
    
    onPlayerStateChanged(args) {
        const isPlaying = args.state === 1; // 1 = Playing
        this.isPlaying = isPlaying;
        this.updatePlayButton(isPlaying);
    }
    
    updatePlayButton(isPlaying) {
        const playIcon = this.elements.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.elements.playPauseBtn.querySelector('.pause-icon');
        
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
    
    onPositionChanged(args) {
        // Update time display
        this.elements.currentTime.textContent = this.formatTime(args.currentTime / 1000);
        this.elements.totalTime.textContent = this.formatTime(args.endTime / 1000);
        
        // Update progress bar
        const percent = (args.currentTime / args.endTime) * 100;
        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressCursor.style.left = `${percent}%`;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    showLoading() {
        this.elements.loadingOverlay.classList.add('visible');
    }
    
    hideLoading() {
        this.elements.loadingOverlay.classList.remove('visible');
    }
}

// Initialize the player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tabPlayer = new TabPlayer();
});

