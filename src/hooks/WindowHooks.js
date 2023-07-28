import React from 'react'

/** Window fullscreen mode */
export const useFullscreen = () => {

    // State
    const [ fullscreenElement, setFullscreenElement ] = React.useState(document.fullscreenElement)

    // Listen for fullscreen changes
    React.useEffect(() => {

        // Create listener
        let listener = () => {
            setFullscreenElement(document.fullscreenElement)
        }

        // Add listener
        document.addEventListener('fullscreenchange', listener)

        // On remove...
        return () => document.removeEventListener('fullscreenchange', listener)

    })

    // Go fullscreen
    const goFullscreen = (element) => {
        if (element) element.requestFullscreen()
        else document.exitFullscreen()
    }

    // Return results
    return [ fullscreenElement, goFullscreen ]

}