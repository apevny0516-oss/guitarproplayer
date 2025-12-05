/**
 * Sync Editor
 * Creates sync files for playing Guitar Pro tabs with real audio
 */

class SyncEditor {
    constructor() {
        this.wavesurfer = null;
        this.alphaTab = null;
        this.score = null;
        this.audioFile = null;
        this.gpFile = null;
        this.gpFileData = null; // Store the raw GP file data
        
        // Beat markers: array of { bar: number, time: number (in seconds) }
        this.beatMarkers = [];
        this.currentBarToMark = 1;
        this.totalBars = 0;
        
        // Playback state
        this.isPlaying = false;
        this.playbackSpeed = 1.0;
        
        // DOM Elements
        this.elements = {
            // File inputs
            gpFileInput: document.getElementById('gpFileInput'),
            audioFileInput: document.getElementById('audioFileInput'),
            gpDropZone: document.getElementById('gpDropZone'),
            audioDropZone: document.getElementById('audioDropZone'),
            gpFileName: document.getElementById('gpFileName'),
            audioFileName: document.getElementById('audioFileName'),
            gpStatus: document.getElementById('gpStatus'),
            audioStatus: document.getElementById('audioStatus'),
            syncStatus: document.getElementById('syncStatus'),
            
            // Project
            projectName: document.getElementById('projectName'),
            
            // Waveform
            waveformContainer: document.getElementById('waveform'),
            waveformCurrentTime: document.getElementById('waveformCurrentTime'),
            waveformTotalTime: document.getElementById('waveformTotalTime'),
            beatMarkersContainer: document.getElementById('beatMarkers'),
            
            // Tap controls
            tapBtn: document.getElementById('tapBtn'),
            currentBarNumber: document.getElementById('currentBarNumber'),
            barSublabel: document.getElementById('barSublabel'),
            undoBtn: document.getElementById('undoBtn'),
            clearAllBtn: document.getElementById('clearAllBtn'),
            
            // Playback controls
            playPauseBtn: document.getElementById('playPauseBtn'),
            skipBackBtn: document.getElementById('skipBackBtn'),
            rewindBtn: document.getElementById('rewindBtn'),
            forwardBtn: document.getElementById('forwardBtn'),
            skipForwardBtn: document.getElementById('skipForwardBtn'),
            speedSlider: document.getElementById('speedSlider'),
            speedValue: document.getElementById('speedValue'),
            
            // Notation
            notationPreview: document.getElementById('notationPreview'),
            trackSelect: document.getElementById('trackSelect'),
            
            // Stats
            totalBars: document.getElementById('totalBars'),
            markersSet: document.getElementById('markersSet'),
            audioDuration: document.getElementById('audioDuration'),
            syncProgressBar: document.getElementById('syncProgressBar'),
            
            // Timeline
            markersTimeline: document.getElementById('markersTimeline'),
            
            // Actions
            exportBtn: document.getElementById('exportBtn'),
            loadSyncBtn: document.getElementById('loadSyncBtn'),
            loadSyncInput: document.getElementById('loadSyncInput'),
            
            // Export Modal
            exportModal: document.getElementById('exportModal'),
            closeExportModal: document.getElementById('closeExportModal'),
            cancelExport: document.getElementById('cancelExport'),
            confirmExport: document.getElementById('confirmExport'),
            exportTitle: document.getElementById('exportTitle'),
            exportArtist: document.getElementById('exportArtist'),
            summaryGpFile: document.getElementById('summaryGpFile'),
            summaryAudioFile: document.getElementById('summaryAudioFile'),
            summaryBars: document.getElementById('summaryBars'),
            
            // Loading
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingText: document.getElementById('loadingText')
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initWavesurfer();
    }
    
    initWavesurfer() {
        this.wavesurfer = WaveSurfer.create({
            container: this.elements.waveformContainer,
            waveColor: '#3d4450',
            progressColor: '#00d4aa',
            cursorColor: '#ff6b6b',
            cursorWidth: 2,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 'auto',
            normalize: true,
            backend: 'WebAudio'
        });
        
        this.wavesurfer.on('ready', () => {
            this.hideLoading();
            this.enableAudioControls(true);
            const duration = this.wavesurfer.getDuration();
            this.elements.waveformTotalTime.textContent = this.formatTime(duration);
            this.elements.audioDuration.textContent = this.formatTimeShort(duration);
            this.elements.audioStatus.textContent = 'Loaded';
            this.elements.audioStatus.classList.add('complete');
            this.updateTapButtonState();
        });
        
        this.wavesurfer.on('audioprocess', () => {
            const currentTime = this.wavesurfer.getCurrentTime();
            this.elements.waveformCurrentTime.textContent = this.formatTime(currentTime);
            this.highlightCurrentBar(currentTime);
        });
        
        this.wavesurfer.on('seeking', () => {
            const currentTime = this.wavesurfer.getCurrentTime();
            this.elements.waveformCurrentTime.textContent = this.formatTime(currentTime);
        });
        
        this.wavesurfer.on('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
        });
        
        this.wavesurfer.on('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
        
        this.wavesurfer.on('finish', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
    }
    
    initAlphaTab() {
        this.elements.notationPreview.innerHTML = '';
        
        const settings = {
            core: {
                fontDirectory: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/',
                file: null,
                tracks: [0]
            },
            display: {
                staveProfile: 'Default',
                layoutMode: 'Horizontal',
                scale: 0.7,
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
                    scoreTitle: false,
                    scoreSubTitle: false,
                    scoreArtist: false,
                    scoreAlbum: false,
                    scoreWords: false,
                    scoreMusic: false,
                    scoreCopyright: false,
                    guitarTuning: true
                }
            },
            player: {
                enablePlayer: false,
                enableCursor: false,
                enableUserInteraction: false
            }
        };
        
        this.alphaTab = new alphaTab.AlphaTabApi(this.elements.notationPreview, settings);
        
        this.alphaTab.scoreLoaded.on((score) => {
            this.onScoreLoaded(score);
        });
        
        this.alphaTab.renderFinished.on(() => {
            this.hideLoading();
        });
    }
    
    bindEvents() {
        // File inputs
        this.elements.gpFileInput.addEventListener('change', (e) => {
            this.loadGPFile(e.target.files[0]);
        });
        
        this.elements.audioFileInput.addEventListener('change', (e) => {
            this.loadAudioFile(e.target.files[0]);
        });
        
        // Load sync file
        this.elements.loadSyncBtn.addEventListener('click', () => {
            this.elements.loadSyncInput.click();
        });
        
        this.elements.loadSyncInput.addEventListener('change', (e) => {
            this.loadSyncFile(e.target.files[0]);
        });
        
        // Drop zones
        this.setupDropZone(this.elements.gpDropZone, this.elements.gpFileInput);
        this.setupDropZone(this.elements.audioDropZone, this.elements.audioFileInput);
        
        // Tap button
        this.elements.tapBtn.addEventListener('click', () => this.recordBeatMarker());
        
        // Undo/Clear
        this.elements.undoBtn.addEventListener('click', () => this.undoLastMarker());
        this.elements.clearAllBtn.addEventListener('click', () => this.clearAllMarkers());
        
        // Playback controls
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.skipBackBtn.addEventListener('click', () => this.skipToStart());
        this.elements.rewindBtn.addEventListener('click', () => this.rewind());
        this.elements.forwardBtn.addEventListener('click', () => this.forward());
        this.elements.skipForwardBtn.addEventListener('click', () => this.skipToEnd());
        
        // Speed slider
        this.elements.speedSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.playbackSpeed = value / 100;
            this.elements.speedValue.textContent = `${value}%`;
            if (this.wavesurfer) {
                this.wavesurfer.setPlaybackRate(this.playbackSpeed);
            }
        });
        
        // Track selection
        this.elements.trackSelect.addEventListener('change', (e) => {
            const trackIndex = parseInt(e.target.value);
            if (!isNaN(trackIndex) && this.score) {
                this.alphaTab.renderTracks([this.score.tracks[trackIndex]]);
            }
        });
        
        // Export
        this.elements.exportBtn.addEventListener('click', () => this.showExportModal());
        this.elements.closeExportModal.addEventListener('click', () => this.hideExportModal());
        this.elements.cancelExport.addEventListener('click', () => this.hideExportModal());
        this.elements.confirmExport.addEventListener('click', () => this.exportSyncFile());
        
        // Close modal on backdrop click
        this.elements.exportModal.addEventListener('click', (e) => {
            if (e.target === this.elements.exportModal) {
                this.hideExportModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't handle shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'KeyT':
                    e.preventDefault();
                    this.recordBeatMarker();
                    break;
                case 'KeyZ':
                    if (e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        this.undoLastMarker();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.rewind();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.forward();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.skipToStart();
                    break;
                case 'End':
                    e.preventDefault();
                    this.skipToEnd();
                    break;
                case 'Escape':
                    this.hideExportModal();
                    break;
            }
        });
    }
    
    setupDropZone(zone, input) {
        zone.addEventListener('click', () => input.click());
        
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event('change'));
            }
        });
    }
    
    loadGPFile(file) {
        if (!file) return;
        
        this.gpFile = file;
        this.showLoading('Loading Guitar Pro file...');
        
        // Update UI
        this.elements.gpFileName.textContent = file.name;
        this.elements.gpDropZone.classList.add('has-file');
        this.elements.gpStatus.textContent = 'Loading...';
        
        // Update project name
        const songName = file.name.replace(/\.[^/.]+$/, '');
        this.elements.projectName.textContent = songName;
        
        // Initialize alphaTab if needed
        if (!this.alphaTab) {
            this.initAlphaTab();
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.gpFileData = new Uint8Array(e.target.result);
            this.alphaTab.load(this.gpFileData);
        };
        reader.onerror = () => {
            this.hideLoading();
            this.elements.gpStatus.textContent = 'Error';
            alert('Failed to load Guitar Pro file');
        };
        reader.readAsArrayBuffer(file);
    }
    
    loadAudioFile(file) {
        if (!file) return;
        
        this.audioFile = file;
        this.showLoading('Loading audio file...');
        
        // Update UI
        this.elements.audioFileName.textContent = file.name;
        this.elements.audioDropZone.classList.add('has-file');
        this.elements.audioStatus.textContent = 'Loading...';
        
        // Remove placeholder
        const placeholder = this.elements.waveformContainer.querySelector('.waveform-placeholder');
        if (placeholder) placeholder.remove();
        
        // Load into wavesurfer
        this.wavesurfer.loadBlob(file);
    }
    
    loadSyncFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const syncData = JSON.parse(e.target.result);
                this.applySyncData(syncData);
            } catch (err) {
                alert('Invalid sync file format');
            }
        };
        reader.readAsText(file);
    }
    
    applySyncData(syncData) {
        // Apply loaded sync data
        if (syncData.markers && Array.isArray(syncData.markers)) {
            this.beatMarkers = syncData.markers;
            this.currentBarToMark = this.beatMarkers.length + 1;
            
            // Update UI
            this.updateAllDisplays();
            
            // Set title/artist if present
            if (syncData.title) {
                this.elements.exportTitle.value = syncData.title;
                this.elements.projectName.textContent = syncData.title;
            }
            if (syncData.artist) {
                this.elements.exportArtist.value = syncData.artist;
            }
            
            // Prompt to load the associated files
            alert(`Sync data loaded with ${this.beatMarkers.length} markers.\n\nPlease load the GP file: ${syncData.gpFile || 'Unknown'}\nAnd audio file: ${syncData.audioFile || 'Unknown'}`);
        }
    }
    
    onScoreLoaded(score) {
        this.score = score;
        
        // Count total bars
        this.totalBars = score.masterBars.length;
        this.elements.totalBars.textContent = this.totalBars;
        
        // Update status
        this.elements.gpStatus.textContent = 'Loaded';
        this.elements.gpStatus.classList.add('complete');
        
        // Populate track selector
        this.elements.trackSelect.innerHTML = '';
        score.tracks.forEach((track, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = track.name || `Track ${index + 1}`;
            this.elements.trackSelect.appendChild(option);
        });
        
        // Reset markers if this is a new file
        if (this.beatMarkers.length === 0 || this.beatMarkers.length > this.totalBars) {
            this.beatMarkers = [];
            this.currentBarToMark = 1;
        }
        
        // Pre-fill export fields from score metadata
        if (score.title) this.elements.exportTitle.value = score.title;
        if (score.artist) this.elements.exportArtist.value = score.artist;
        
        this.updateAllDisplays();
        this.hideLoading();
    }
    
    recordBeatMarker() {
        if (!this.wavesurfer || !this.score) return;
        if (this.currentBarToMark > this.totalBars) return;
        
        const currentTime = this.wavesurfer.getCurrentTime();
        
        // Add marker
        this.beatMarkers.push({
            bar: this.currentBarToMark,
            time: currentTime
        });
        
        // Advance to next bar
        this.currentBarToMark++;
        
        // Update everything
        this.updateAllDisplays();
        
        // Visual feedback
        this.flashTapButton();
    }
    
    flashTapButton() {
        this.elements.tapBtn.classList.add('tapped');
        setTimeout(() => {
            this.elements.tapBtn.classList.remove('tapped');
        }, 150);
    }
    
    undoLastMarker() {
        if (this.beatMarkers.length === 0) return;
        
        this.beatMarkers.pop();
        this.currentBarToMark--;
        
        this.updateAllDisplays();
    }
    
    clearAllMarkers() {
        if (this.beatMarkers.length === 0) return;
        if (!confirm('Clear all beat markers? This cannot be undone.')) return;
        
        this.beatMarkers = [];
        this.currentBarToMark = 1;
        
        this.updateAllDisplays();
    }
    
    updateAllDisplays() {
        this.updateCurrentBarDisplay();
        this.updateMarkersDisplay();
        this.updateMarkersTimeline();
        this.updateSyncStats();
        this.updateButtonStates();
    }
    
    updateCurrentBarDisplay() {
        if (this.totalBars === 0) {
            this.elements.currentBarNumber.textContent = '—';
            this.elements.barSublabel.textContent = 'Load files to begin';
            return;
        }
        
        if (this.currentBarToMark > this.totalBars) {
            this.elements.currentBarNumber.textContent = '✓';
            this.elements.currentBarNumber.classList.add('complete');
            this.elements.barSublabel.textContent = 'All bars marked!';
        } else {
            this.elements.currentBarNumber.textContent = this.currentBarToMark;
            this.elements.currentBarNumber.classList.remove('complete');
            this.elements.barSublabel.textContent = `of ${this.totalBars} bars`;
        }
    }
    
    updateMarkersDisplay() {
        this.elements.beatMarkersContainer.innerHTML = '';
        
        if (!this.wavesurfer) return;
        const duration = this.wavesurfer.getDuration();
        if (duration === 0) return;
        
        this.beatMarkers.forEach((marker) => {
            const percent = (marker.time / duration) * 100;
            const el = document.createElement('div');
            el.className = 'beat-marker';
            el.style.left = `${percent}%`;
            el.dataset.bar = `Bar ${marker.bar}`;
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.wavesurfer.seekTo(marker.time / duration);
            });
            this.elements.beatMarkersContainer.appendChild(el);
        });
    }
    
    updateMarkersTimeline() {
        if (this.totalBars === 0) {
            this.elements.markersTimeline.innerHTML = '<div class="timeline-empty">Load files to see bar timeline</div>';
            return;
        }
        
        const container = document.createElement('div');
        container.className = 'timeline-markers';
        
        for (let i = 1; i <= this.totalBars; i++) {
            const marker = this.beatMarkers.find(m => m.bar === i);
            const el = document.createElement('div');
            el.className = 'timeline-marker' + (marker ? ' set' : '');
            el.dataset.bar = i;
            el.innerHTML = `
                <span class="marker-bar">${i}</span>
                <span class="marker-time">${marker ? this.formatTimeShort(marker.time) : '—'}</span>
            `;
            
            if (marker) {
                el.addEventListener('click', () => {
                    if (this.wavesurfer) {
                        const duration = this.wavesurfer.getDuration();
                        this.wavesurfer.seekTo(marker.time / duration);
                    }
                });
            }
            
            container.appendChild(el);
        }
        
        this.elements.markersTimeline.innerHTML = '';
        this.elements.markersTimeline.appendChild(container);
    }
    
    updateSyncStats() {
        this.elements.markersSet.textContent = this.beatMarkers.length;
        this.elements.syncStatus.textContent = `${this.beatMarkers.length} / ${this.totalBars} bars`;
        
        // Update progress bar
        const percent = this.totalBars > 0 ? (this.beatMarkers.length / this.totalBars) * 100 : 0;
        this.elements.syncProgressBar.style.width = `${percent}%`;
    }
    
    updateButtonStates() {
        const hasMarkers = this.beatMarkers.length > 0;
        const canTap = this.score && this.wavesurfer && this.wavesurfer.getDuration() > 0 && this.currentBarToMark <= this.totalBars;
        
        this.elements.undoBtn.disabled = !hasMarkers;
        this.elements.clearAllBtn.disabled = !hasMarkers;
        this.elements.exportBtn.disabled = !hasMarkers;
        this.elements.tapBtn.disabled = !canTap;
    }
    
    updateTapButtonState() {
        const hasGP = this.score !== null;
        const hasAudio = this.wavesurfer && this.wavesurfer.getDuration() > 0;
        const notComplete = this.currentBarToMark <= this.totalBars;
        
        this.elements.tapBtn.disabled = !(hasGP && hasAudio && notComplete);
    }
    
    highlightCurrentBar(currentTime) {
        // Find which bar we're in based on markers
        let currentBar = 0;
        for (let i = 0; i < this.beatMarkers.length; i++) {
            if (currentTime >= this.beatMarkers[i].time) {
                currentBar = this.beatMarkers[i].bar;
            } else {
                break;
            }
        }
        
        // Highlight in timeline
        const timelineMarkers = this.elements.markersTimeline.querySelectorAll('.timeline-marker');
        timelineMarkers.forEach((el) => {
            const bar = parseInt(el.dataset.bar);
            el.classList.toggle('current', bar === currentBar);
        });
    }
    
    // Playback controls
    togglePlayPause() {
        if (!this.wavesurfer) return;
        this.wavesurfer.playPause();
    }
    
    skipToStart() {
        if (!this.wavesurfer) return;
        this.wavesurfer.seekTo(0);
    }
    
    skipToEnd() {
        if (!this.wavesurfer) return;
        this.wavesurfer.seekTo(0.999);
    }
    
    rewind() {
        if (!this.wavesurfer) return;
        const currentTime = this.wavesurfer.getCurrentTime();
        const duration = this.wavesurfer.getDuration();
        const newTime = Math.max(0, currentTime - 5);
        this.wavesurfer.seekTo(newTime / duration);
    }
    
    forward() {
        if (!this.wavesurfer) return;
        const currentTime = this.wavesurfer.getCurrentTime();
        const duration = this.wavesurfer.getDuration();
        const newTime = Math.min(duration, currentTime + 5);
        this.wavesurfer.seekTo(newTime / duration);
    }
    
    updatePlayButton() {
        const playIcon = this.elements.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.elements.playPauseBtn.querySelector('.pause-icon');
        
        playIcon.style.display = this.isPlaying ? 'none' : 'block';
        pauseIcon.style.display = this.isPlaying ? 'block' : 'none';
    }
    
    enableAudioControls(enabled) {
        this.elements.playPauseBtn.disabled = !enabled;
        this.elements.skipBackBtn.disabled = !enabled;
        this.elements.rewindBtn.disabled = !enabled;
        this.elements.forwardBtn.disabled = !enabled;
        this.elements.skipForwardBtn.disabled = !enabled;
        
        this.updateTapButtonState();
    }
    
    // Export functionality
    showExportModal() {
        // Pre-fill summary
        this.elements.summaryGpFile.textContent = this.gpFile ? this.gpFile.name : '—';
        this.elements.summaryAudioFile.textContent = this.audioFile ? this.audioFile.name : '—';
        this.elements.summaryBars.textContent = `${this.beatMarkers.length} of ${this.totalBars}`;
        
        this.elements.exportModal.classList.add('visible');
    }
    
    hideExportModal() {
        this.elements.exportModal.classList.remove('visible');
    }
    
    exportSyncFile() {
        const syncData = {
            version: 2,
            title: this.elements.exportTitle.value || 'Untitled',
            artist: this.elements.exportArtist.value || 'Unknown Artist',
            gpFile: this.gpFile ? this.gpFile.name : null,
            audioFile: this.audioFile ? this.audioFile.name : null,
            totalBars: this.totalBars,
            markers: this.beatMarkers,
            createdAt: new Date().toISOString()
        };
        
        const json = JSON.stringify(syncData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const filename = `${syncData.title.replace(/[^a-z0-9]/gi, '_')}.tabsync`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        this.hideExportModal();
    }
    
    // Utility functions
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    
    formatTimeShort(seconds) {
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
    window.syncEditor = new SyncEditor();
});
