import React from 'react'

/** Hook which creates a timer which also ensures it only runs one at a time. */
export const useInterval = (callback, interval, runImmediately = false, disabled = false, dependencies = []) => {

    // State
    const timerState = React.useRef({})

    // Called when the timer ticks
    const onTimer = async () => {

        // Stop if already running
        if (timerState.current.running) return
        timerState.current.running = true

        // Catch errors
        try {

            // Call callback
            await callback()

        } catch (err) {

            // Log error
            console.error(err)

        } finally {

            // Stop running
            timerState.current.running = false

        }

    }

    // Called when the component mounts
    React.useEffect(() => {

        // Start timer
        if (!disabled)
            timerState.current.id = setInterval(onTimer, interval)

        // On unmount...
        return () => {

            // Stop timer
            if (timerState.current.id) {
                clearInterval(timerState.current.id)
                timerState.current.id = null
            }

        }

    }, [ callback, interval, disabled, ...dependencies ])

    // Run immediately
    React.useEffect(() => {
            
        // Run immediately
        if (runImmediately)
            onTimer()

    }, [])

}