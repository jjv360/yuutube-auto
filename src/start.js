import React from 'react'
import ReactDOM from 'react-dom/client'
import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { YouTube } from './utils/YouTube'
import { usePlaylist, useVideos } from './hooks/YouTubeHooks'
import { useArrayStorage } from './hooks/LocalStorage'
import { useInterval } from './hooks/Timers'
import YouTubePlayer from 'react-youtube'
import { useFullscreen } from './hooks/WindowHooks'
import sanitizeHtml from 'sanitize-html'

// Setup YouTube
const DefaultAPIKey = 'AIzaSyC1XUOKwT-y0yaOpNdCmmnoqm9dSDfZoyE'
YouTube.shared.apiKey = localStorage['youtube.apiKey'] || DefaultAPIKey

// Setup Firebase
getAnalytics(initializeApp({
    apiKey: "AIzaSyC1XUOKwT-y0yaOpNdCmmnoqm9dSDfZoyE",
    authDomain: "yuutube-auto.firebaseapp.com",
    projectId: "yuutube-auto",
    storageBucket: "yuutube-auto.appspot.com",
    messagingSenderId: "465654268947",
    appId: "1:465654268947:web:fc45490782c712761eebe6",
    measurementId: "G-KXV4Z94LK2"
}))
 
// Main app component
const App = () => {

    // Get stored state
    const [ searchStrings, setSearchStrings ] = useArrayStorage('yuutube.searchStrings')

    // State
    const [ currentVideo, setCurrentVideo ] = React.useState(null)
    const [ nextVideos, setNextVideos ] = React.useState([])
    const [ playedCount, setPlayedCount ] = React.useState(0)
    const [ lastUpdateError, setLastUpdateError ] = React.useState(null)

    // Hook to enable going fullscreen
    const [ isFullscreen, setFullscreenElement ] = useFullscreen()

    // Called to add a search string
    const onAddSearch = () => {

        // Get search string
        let searchString = prompt('Enter a search string below. This can be anything you would type into YouTube to search for videos. To use all videos from a specific channel, prefix it with "channel:"')
        if (!searchString)
            return

        // Check that it doesn't exist already
        if (searchStrings.includes(searchString))
            return alert('That search string already exists.')

        // Add it
        setSearchStrings([...searchStrings, searchString])

    }

    // Called to remove a search string
    const onRemoveSearch = (searchString) => {

        // Confirm
        if (!confirm(`Are you sure you want to remove the search string "${searchString}"?`))
            return

        // Remove it
        setSearchStrings(searchStrings.filter(s => s !== searchString))

    }

    // Called to skip the current video
    const onSkip = () => {

        // Skip video
        YouTube.shared.nextVideo()

        // Update state
        setCurrentVideo(YouTube.shared.currentVideo)
        setNextVideos(YouTube.shared.upcomingVideos)
        setPlayedCount(YouTube.shared.playedVideos.length)

    }

    // Called to reset all played videos
    const onReset = () => {

        // Skip video
        YouTube.shared.resetPlayedVideos()

        // Update state
        setCurrentVideo(YouTube.shared.currentVideo)
        setNextVideos(YouTube.shared.upcomingVideos)
        setPlayedCount(YouTube.shared.playedVideos.length)

    }

    // Called to allow the user to set their own API key
    const onSetAPIKey = () => {

        // Get API key
        let apiKey = prompt('Enter your own YouTube Data API key below. This is optional, but recommended. If you don\'t have one, you can get one for free at https://console.developers.google.com/apis/credentials. \n\nEnter "none" to reset it.')
        if (!apiKey)
            return

        // Reset
        if (apiKey === 'none')
            apiKey = ''

        // Set it
        YouTube.shared.apiKey = apiKey || DefaultAPIKey
        localStorage['youtube.apiKey'] = apiKey

        // Clear cache
        YouTube.shared.clearCache()

    }

    // Create timer
    useInterval(async () => {

        // Fetch next videos
        YouTube.shared.searchQueries = searchStrings
        let didUpdate = await YouTube.shared.update()
        setLastUpdateError(YouTube.shared.lastUpdateError)
        if (!didUpdate)
            return

        // Update state
        setCurrentVideo(YouTube.shared.currentVideo)
        setNextVideos(YouTube.shared.upcomingVideos)
        setPlayedCount(YouTube.shared.playedVideos.length)

    }, 1000, true)
        
    // Render UI
    return <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        
        {/* Left panel */}
        <div id='video-panel' style={{ position: 'absolute', top: 0, left: 0, width: 'calc(100% - 360px)', height: '100%', backgroundColor: '#111' }}>

            {/* Nothing playing */}
            { currentVideo ? 
                <YouTubePlayer
                    key={currentVideo.id.videoId}
                    videoId={currentVideo.id.videoId} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                    onEnd={onSkip}
                    opts={{
                        width: '100%',
                        height: '100%',
                        playerVars: {
                            autoplay: 1,
                            fs: 0,          // <-- Disable fullscreen because we have our own, which supports staying fullscreen when switching videos
                        }
                    }} 
                />
            :
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', fontSize: 26, fontWeight: 'bold', color: '#666' }}>Nothing playing</div>
            }

            {/* Exit fullscreen button */}
            { isFullscreen ?
                <div style={{ position: 'absolute', top: 10, right: 10, width: 44, height: 44, cursor: 'pointer', backgroundColor: '#333', borderRadius: 8 }} onClick={() => setFullscreenElement(null)}>
                    <img src={require('./assets/exit-fullscreen.svg')} style={{ position: 'absolute', top: '20%', left: '20%', width: '60%', height: '60%' }} />
                </div>
            : null }

        </div>

        {/* Right panel */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 360, height: '100%', borderLeft: '1px solid #333', overflowX: 'hidden', overflowY: 'auto' }}>

            {/* Header */}
            <img src={require('./assets/youtube.svg')} style={{ display: 'block', height: 96, margin: '50px auto 30px auto' }} />
            <div style={{ textAlign: 'center', fontSize: 26, fontWeight: 'bold', marginBottom: 10 }}>Yuutube Auto</div>
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 40 }}>Automatic Playlists</div>

            {/* Searches */}
            <Header title="Searches" />
            { searchStrings.map((searchString, idx) => 
                <MenuButton key={idx} title={searchString} onClick={() => onRemoveSearch(searchString)} />
            )}
            <MenuButton title="+ add search" onClick={onAddSearch} />

            {/* Error */}
            { lastUpdateError ?
                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#840', margin: '0px 50px' }}>
                    {sanitizeHtml(lastUpdateError.message, { allowedTags: ['b', 'i', 'em', 'strong'], allowedAttributes: [] })}
                </div>
            : null }

            {/* Next video */}
            <Header title="Playing" />
            <MenuItem title={currentVideo?.snippet?.title || 'None'} subtitle={currentVideo?.snippet?.channelTitle} image={currentVideo?.snippet?.thumbnails?.medium?.url} />
            <MenuButton title="Go fullscreen" onClick={() => setFullscreenElement(document.getElementById('video-panel'))} />
            <MenuButton title="Skip video" onClick={onSkip} />
            <MenuButton title="Reset played videos" onClick={onReset} />
            <MenuButton title="Set API key" onClick={onSetAPIKey} />

            {/* Watched counter */}
            <div style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center', margin: 5, color: '#444' }}>Watched {playedCount} videos</div>

            {/* Future videos */}
            <Header title="Upcoming" />
            { nextVideos.map(video => 
                <MenuItem key={video.id.videoId} title={video.snippet.title} subtitle={video.snippet.channelTitle} image={video.snippet.thumbnails.medium?.url} />
            )}

        </div>

        {/* GitHub overlay logo */}
        {/* <a href='https://github.com/jjv360/yuutube-auto' target='_blank' style={{ position: 'absolute', top: 0, right: 0 }}>
            <img src={require('./assets/github-sidelogo.svg')} style={{ display: 'block', height: 50, margin: 0, opacity: 0.2 }} />
        </a> */}
        
    </div>
    
}

/** Header */
const Header = props => <div style={{ fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', color: '#666', margin: '30px 10px 5px 10px' }}>{props.title}</div>

/** Menu item */
const MenuItem = props => <div style={{ margin: '5px 10px', display: 'flex', borderRadius: 8, backgroundColor: '#222', height: 60, cursor: 'pointer', overflow: 'hidden', alignItems: 'center' }} onClick={props.onClick}>

    {/* Thumbnail */}
    <div style={{ flex: '0 0 auto', backgroundImage: 'url(' + (props.image || require('./assets/default.svg')) + ')', backgroundSize: 'cover', backgroundPosition: 'center', width: 80, height: '100%' }} />

    {/* Text */}
    <div style={{ flex: '1 1 1px', margin: '10px 5px 10px 20px', overflow: 'hidden' }}>
        
        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 3, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{props.title}</div>

        {/* Subtitle */}
        <div style={{ fontSize: 12, fontWeight: 'bold', color: '#666', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{props.subtitle || '(no description)'}</div>
        
    </div>

</div>

/** Menu button */
const MenuButton = props => <div style={{ margin: '5px 10px', display: 'flex', borderRadius: 8, backgroundColor: '#222', alignItems: 'center', cursor: 'pointer' }} onClick={props.onClick}>

    {/* Icon */}

    {/* Text */}
    <div style={{ flex: '1 1 1px', fontSize: 14, fontWeight: 'bold', color: '#666', textAlign: 'center', margin: '10px 20px' }}>{props.title}</div>

</div>

// Render the app
ReactDOM.createRoot(document.getElementById('root')).render(<App />)