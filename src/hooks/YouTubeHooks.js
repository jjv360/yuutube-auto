import React from 'react'
import { YouTube } from '../utils/YouTube'

/** Hook to fetch a list of videos to play */
export const useVideos = (searchStrings, playedIDs) => {

    // Function to fetch the next videos
    const fetchVideos = async () => {
        
        // Perform searches
        let searchResults = await Promise.all(searchStrings.map(async searchString => {

            // Catch errors
            try {

                // Fetch videos
                return await YouTube.shared.search(searchString)

            } catch (err) {

                // Ignore errors
                console.error(err)
                return []

            }

        }))
        searchResults = searchResults.flat()

        // Filter to only show videos
        console.log(searchResults)

    }

    // Done
    return { fetchVideos }

}