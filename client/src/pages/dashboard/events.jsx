import React, { useContext } from 'react'
import Layout from '../../Components/dashboard/layout'
import { Button } from '../../Components/shared/button'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { KitContext } from '../../context/kit-context'
import { useState, useEffect } from 'react'
import { useContractRead } from '@starknet-react/core'
import EventCard from '../../Components/dashboard/event-card'

const Events = () => {
    const { address, account, contract, eventAbi, contractAddr } = useContext(KitContext)
    console.log(account)

    const { data, isError, isLoading, error } = useContractRead({
        functionName: "get_event_count",
        args: [],
        abi: eventAbi,
        address: contractAddr,
        watch: true,
    });
    if (isLoading) {
        return (
            <div className='flex text-center justify-center items-center w-full h-screen'>
                <h1 className='text-deep-blue text-6xl font-bold'>Loading...</h1>
            </div>
        )
    }

    if (isError) {
        return <div>Error: {error.message}</div>
    }

    const eventCount = data?.toString();

    console.log(data.toString())
    return (
        <Layout>
            <div>
                <div className='flex justify-between items-center'>
                    <h1 className='text-3xl text-deep-blue font-semibold'>
                        All Events
                    </h1>
                    <Link to={"/create-events"}>
                        <Button className="bg-deep-blue text-primary px-8 py-6 text-lg flex gap-2 hover:text-deep-blue">
                            <Plus className='text-lg' /> Create Event
                        </Button>
                    </Link>
                </div>
            </div>
            <div className='flex flex-wrap gap-6'>
                {Array(parseInt(eventCount)).fill(0).map((_, index) => (
                    <EventCard key={index} id={index + 1}/>
                ))}
            </div>

        </Layout>
    )
}

export default Events