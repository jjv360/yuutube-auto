import React, { useMemo } from 'react'

// List of listeners when a key changes
let listeners = {}

/** React hook which allows reading and writing to localStorage and receiving updates. */
export const useStorage = (key) => {

    // Initial state
    let initialState = useMemo(() => localStorage[key] || '', [key])

    // State
    const [ data, setDataInternal ] = React.useState(initialState)

    // Listen for changes
    React.useEffect(() => {

        // Create listener
        let listener = (newData) => {
            setDataInternal(newData)
        }

        // Add listener
        if (!listeners[key]) listeners[key] = []
        listeners[key].push(listener)

        // On remove...
        return () => {

            // Remove listener
            listeners[key] = listeners[key].filter(l => l !== listener)

        }

    }, [ key ])

    // Update data
    const setData = (data) => {
        
        // Save it
        localStorage[key] = data

        // Update state
        // setDataInternal(data)

        // Send out updates
        if (listeners[key])
            listeners[key].forEach(l => l(data))
        
    }

    // Return
    return [ data, setData ]

}

/** React hook which allows reading and writing an array to localStorage */
export const useArrayStorage = (key) => {

    // Use string storage
    const [ data, setData ] = useStorage(key)

    // Parse data
    let arrayData = useMemo(() => {
        try {
            return JSON.parse(data) || []
        } catch (e) {
            return []
        }
    }, [ data ])

    // Notify when it's updated
    const setArrayData = (arrayData) => {

        // Save it
        setData(JSON.stringify(arrayData))

    }

    // Return
    return [ arrayData, setArrayData ]

}