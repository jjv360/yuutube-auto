/**
 * Helper utilities for YouTube
 */
export class YouTube {

    /** Shared instance */
    static shared = new YouTube()

    /** API Key */
    apiKey = ''

    /** List of all processed videos */
    allVideos = []

    /** Cache */
    cache = []

    /** Get previous videos */
    get playedVideos() {
        return this.allVideos.filter(v => v.state == 'played')
    }

    /** Current video */
    get currentVideo() {
        return this.allVideos.find(v => v.state == 'current')
    }

    /** Upcoming videos */
    get upcomingVideos() {
        return this.allVideos.filter(v => v.state == 'upcoming')
    }

    /** Search parameters */
    searchQueries = []

    /** Watched IDs */
    watchedIDs = []

    /** List of cached page tokens for search queries */
    searchPageTokens = {}

    /** Last error returned from YouTube when updating */
    lastUpdateError = null

    /** Constructor */
    constructor() {

        // Load cache
        try {
            this.cache = JSON.parse(localStorage.getItem('youtube-cache')) || []
        } catch (err) {}

        // Load watched IDs
        try {
            this.watchedIDs = JSON.parse(localStorage.getItem('youtube-watched-ids')) || []
        } catch (err) {}

    }

    /** Send API request */
    async api(endpoint) {

        // Clean cache
        let now = Date.now()
        this.cache = this.cache.filter(c => c.expires > now)

        // Find cached value
        let json = this.cache.find(c => c.endpoint === endpoint)?.data
        if (!json) {

            // Send request
            console.debug(`[YouTube] Sending request: ${endpoint}`)
            let response = await fetch(`https://www.googleapis.com/youtube/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${this.apiKey}`)
            json = await response.json()

            // Cache it
            this.cache.push({
                endpoint,
                expires: Date.now() + 1000 * 60 * 15,
                data: json
            })

        }

        // Check for error
        if (json.error)
            throw new Error(json.error.message || json.error.status || 'An unknown error occurred.')

        // Save cache
        localStorage.setItem('youtube-cache', JSON.stringify(this.cache))

        // Done
        return json

    }

    /** Clear cache */
    clearCache() {
        this.cache = []
        localStorage.setItem('youtube-cache', JSON.stringify(this.cache))
    }

    /** Search for videos */
    async search(query, count = 20, pageToken = 'auto') {

        // If page token is auto, get it from the cache
        if (pageToken == 'auto')
            pageToken = this.searchPageTokens[query] || ''

        // Check search type
        let json = null
        if (query.startsWith('channel:')) {

            // Search for the channel
            let channelName = query.replace('channel:', '')
            let jsonChannel = await this.api(`/search?part=snippet&maxResults=1&q=${encodeURIComponent(channelName)}&type=channel`)
            let channelID = jsonChannel.items[0]?.id?.channelId
            if (!channelID)
                throw new Error(`Channel '${channelName}' not found.`)

            // Do a channel listing
            json = await this.api(`/search?part=snippet&maxResults=${count}&channelId=${channelID}&type=video&pageToken=${pageToken}`)

        } else {

            // Do a generic search
            json = await this.api(`/search?part=snippet&maxResults=${count}&q=${encodeURIComponent(query)}&type=video&pageToken=${pageToken}`)

        }

        // Store page token
        this.searchPageTokens[query] = json.nextPageToken

        // Done
        return json.items

    }

    /** Get next videos */
    async update() {

        // Stop if there's enough videos available
        if (this.upcomingVideos.length >= 5)
            return

        // Get search results for all search queries
        this.lastUpdateError = null
        let searchResults = await Promise.all(this.searchQueries.map(async query => {

            // Catch errors
            try {

                // Fetch videos
                return await this.search(query)

            } catch (err) {

                // Log errors
                console.error(err)
                this.lastUpdateError = err
                return []

            }

        }))

        // Flatten results, remove dirty stuff
        searchResults = searchResults.flat().filter(v => v?.id?.videoId)

        // Add each video to the upcoming videos list
        let didUpdate = false
        for (let video of searchResults) {
            if (this.addVideo(video)) {
                didUpdate = true
            }
        }

        // Sort the video list by date
        this.allVideos.sort((a, b) => new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime())

        // If no current video, select one
        if (!this.currentVideo) {

            // Find next video
            let nextVideo = this.allVideos.find(v => v.state === 'upcoming')
            if (nextVideo) {
                nextVideo.state = 'current'
                didUpdate = true
            }

        }

        // Done
        return didUpdate

    }

    /** Add a video to the upcoming videos list */
    addVideo(video) {

        // Check if it's already in the list
        if (this.allVideos.find(v => v.id.videoId === video.id.videoId))
            return false

        // Add it
        video.state = this.watchedIDs.includes(video.id.videoId) ? 'played' : 'upcoming'
        this.allVideos.push(video)
        return true

    }

    /** Go to the next video */
    nextVideo() {

        // Mark current video as played
        if (this.currentVideo) {
            this.currentVideo.state = 'played'
            this.saveWatchedIDs()
        }

        // Find next video
        let nextVideo = this.allVideos.find(v => v.state === 'upcoming')
        if (nextVideo)
            nextVideo.state = 'current'

    }

    /** Reset played videos */
    resetPlayedVideos() {

        // Reset all videos
        for (let video of this.allVideos)
            video.state = 'upcoming'

        // Find next video
        let nextVideo = this.allVideos.find(v => v.state === 'upcoming')
        if (nextVideo)
            nextVideo.state = 'current'

        // Save watched IDs
        this.saveWatchedIDs()
        this.searchPageTokens = {}

    }

    /** Save watched IDs */
    saveWatchedIDs() {
        this.watchedIDs = this.playedVideos.map(v => v.id.videoId)
        localStorage.setItem('youtube-watched-ids', JSON.stringify(this.watchedIDs))
    }

}