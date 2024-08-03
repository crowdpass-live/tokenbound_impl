import React, { useContext, useEffect, useState } from 'react'
import Layout from '../../Components/dashboard/layout'
import { useContractRead } from '@starknet-react/core';
import { useParams } from 'react-router-dom';
import { KitContext } from '../../context/kit-context';
import { Button } from '../../Components/shared/button';
import { Card } from '../../Components/shared/card';
import { CalendarIcon, ClockIcon, HandCoins, MapPinIcon, Tags, Ticket, TicketCheck, TicketMinus, User } from 'lucide-react';
import { feltToString } from '../../helpers';
import { epochToDatetime } from 'datetime-epoch-conversion';
import { MdLiveTv } from "react-icons/md";
import { TokenboundClient } from 'starknet-tokenbound-sdk';
import { RescheduleDialog } from '../../Components/dashboard/reschedule-dialog';
import { Dialog } from '../../Components/shared/dialog';
import TicketDialog from '../../Components/dashboard/ticket-dialog';
import { cairo } from 'starknet';
import strkAbi from '../../Abis/strkAbi.json'
import toast from 'react-hot-toast';


const EventDetails = () => {
    const [formData, setFormData] = useState({
        startTime: '',
        endTime: '',
    })
    const [reclaimed, setReclaimed] = useState(false)

    const [appApproved, setAppApproved] = useState(false)

    const inputChange = (e) => {
        setFormData((prevState) => ({
            ...prevState, [e.target.name]: e.target.value
        }))
    }

    const [tba, setTba] = useState('')
    const { id } = useParams()
    const { address, account, contract, eventAbi, contractAddr, eventContract, readEventContract, strkContract } = useContext(KitContext)


    const { data, isError, isLoading, error } = useContractRead({
        functionName: "get_event",
        args: [id],
        abi: eventAbi,
        address: contractAddr,
        watch: true,
    });

    const { data: userTicket, isError: userTicketIsError, isLoading: userTicketIsLoading, error: userTicketError } = useContractRead({
        functionName: "user_event_ticket",
        args: [id, address],
        abi: eventAbi,
        address: contractAddr,
        watch: true,
    });

    console.log(data)
    console.log(Number(userTicket))

    const startDateResponse = epochToDatetime(String(data?.start_date))
    const endDateResponse = epochToDatetime(String(data?.end_date))


    const handleApprove = async (e) => {
        e.preventDefault()
        const toast1 = toast.loading('Approving App')

        try {

            await strkContract.approve(contract?.address, cairo.uint256(data?.ticket_price))
            toast.remove(toast1);
            toast.success("App approval successful")
        } catch (error) {
            toast.remove(toast1);
            toast.error(error.message)
        }
    }


    const handleSubmit = async (e) => {
        e.preventDefault()
        const toast1 = toast.loading('Purchasing ticket')

        try {

            // await strkContract.approve(contract?.address, cairo.uint256(2))
            handleApprove()
            await eventContract.purchase_ticket(id)
            toast.remove(toast1);
            toast.success("Ticket purchase successful")
        } catch (error) {
            toast.remove(toast1);
            toast.error(error.message)
        }
    }

    // reschedule event
    const rescheduleEvent = async (e) => {
        e.preventDefault()

        const _start_date = new Date(formData.startTime).getTime() / 1000;
        const _end_date = new Date(formData.endTime).getTime() / 1000;

        try {

            await eventContract.reschedule_event(id, _start_date, _end_date)
            alert('succesfully added')

        } catch (error) {
            alert(error.message)
            console.log(error)
        }
    }


    // cancel event
    const cancelEvent = async (e) => {
        e.preventDefault()
        const toast1 = toast.loading('Cancelling Events')

        try {

            await eventContract.cancel_event(id)
            toast.remove(toast1);
            toast.success("Event Cancelled")
        } catch (error) {
            toast.remove(toast1);
            toast.error(error.message)
        }
    }

    const claim_ticket_refund = async (e) => {
        e.preventDefault()
        const toast1 = toast.loading('Reclaiming ticket fee')

        try {

            await eventContract.claim_ticket_refund(id)
            toast.remove(toast1);
            toast.success("Refund claimed")
            setReclaimed(true)
        } catch (error) {
            toast.remove(toast1);
            toast.error(error.message)
        }
    }

    // tokenbound integration
    const options = {
        account: account,
        registryAddress: `0x4101d3fa033024654083dd982273a300cb019b8cb96dd829267a4daf59f7b7e`,
        implementationAddress: `0x45d67b8590561c9b54e14dd309c9f38c4e2c554dd59414021f9d079811621bd`,
        jsonRPC: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/RCp5m7oq9i9myxsvC8ctUmNq2Wq2Pa_v`
    }

    let tokenbound;

    if (account) {
        tokenbound = new TokenboundClient(options)
    }

    console.log(tokenbound)

    // get account status
    const getStatus = async () => {
        try {
            const status = await tokenbound.checkAccountDeployment({
                tokenContract: `0x${data?.event_ticket_addr.toString(16)}`,
                tokenId: userTicket,
                salt: userTicket
            })

            if (status) {
                console.log(status)
            }
        } catch (error) {
            console.log(error)
        }
    }


    const deployAccount = async () => {
        try {
            await tokenbound.createAccount({
                tokenContract: `0x${data?.event_ticket_addr.toString(16)}`,
                tokenId: userTicket,
                salt: userTicket
            })
        }
        catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getStatus()
    }, [])

    const getAccount = async () => {
        try {
            const account = await tokenbound.getAccount({
                tokenContract: `0x${data?.event_ticket_addr.toString(16)}`,
                tokenId: userTicket,
                salt: userTicket
            })

            console.log(`0x${account.toString(16)}`)
            setTba(`0x${account.toString(16)}`)
        } catch (error) {
            console.log(error)
        }

    }

    console.log(tba)

    return (
        <Layout>
            <h1 className='text-3xl text-deep-blue font-semibold'>
                Event Details
            </h1>
            {isLoading ? (
                <h4>Loading ...</h4>
            ) : (
                <Card className="shadow-2xl pb-6 my-4 rounded-xl">

                    <div className="flex flex-col mx-10 mt-10">
                        <section className="rounded-2xl relative w-full h-[200px] sm:h-[300px] lg:h-[300px] overflow-hidden">
                            <img
                                src="/assets/about-image-podcast.jpg"
                                className="absolute inset-0 w-full h-[300px] object-cover "
                            />
                            <div className="absolute inset-0 bg-black/50 z-10" />
                            <div className="relative z-20 h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center text-base-white">
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{feltToString(data?.theme)}</h1>
                                <p className="mt-4 max-w-3xl text-lg sm:text-xl mb-6">
                                    Join us for a day of inspiring talks, networking, and exploring the latest trends in the industry.
                                </p>
                                <div className="flex items-center gap-2 sm:gap-2">
                                    <User className="w-6 h-4 text-muted-foreground font-bold text-white" />
                                    <div className='flex gap-3 items-start'>
                                        <div className="text-[12px] font-bold  text-white">Organizer </div>
                                        <div className="text-[12px]  text-white">0x{(data?.organizer).toString(16)}</div>
                                    </div>
                                </div>
                            </div>
                        </section>
                        <div className="">
                            <div className="flex justify-evenly items-start">
                                <div className='flex flex-col gap-6 mt-4 w-[50%]'>
                                    <div className="flex items-start gap-4 sm:gap-6">
                                        <CalendarIcon className="w-6 h-6 text-muted-foreground text-[#777D7F] " />
                                        <div className='flex flex-col gap-1'>
                                            <div className="text-sm sm:text-base font-medium  text-[#777D7F]">Start date  </div>
                                            <div className="text-muted-foreground text-sm text-slate-700 font-semibold">{startDateResponse.dateTime}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 sm:gap-6">
                                        <ClockIcon className="w-6 h-6 text-muted-foreground text-[#777D7F]" />
                                        <div className='flex flex-col gap-1'>
                                            <div className="text-sm sm:text-base font-medium  text-[#777D7F]">End date  </div>
                                            <div className="text-muted-foreground text-sm text-slate-700 font-semibold">{endDateResponse.dateTime}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 sm:gap-6">
                                        <MapPinIcon className="w-6 h-6 text-muted-foreground text-[#777D7F]" />
                                        <div className='flex flex-col gap-1'>
                                            <div className="text-sm sm:text-base font-medium  text-[#777D7F]">Location </div>
                                            <div className="text-muted-foreground text-sm text-slate-700 font-semibold">{feltToString(data?.event_type)}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 sm:gap-6">
                                        <Ticket className="w-6 h-6 text-muted-foreground text-[#777D7F]" />
                                        <div className='flex flex-col gap-1'>
                                            <div className="text-sm sm:text-base font-medium  text-[#777D7F]">Ticket Price </div>
                                            <div className="text-muted-foreground text-sm text-slate-700 font-semibold">{String(data?.ticket_price).slice(0, -18)} STRK</div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 sm:gap-6">
                                        <MdLiveTv className="w-6 h-6 text-muted-foreground text-[#777D7F]" />
                                        <div className='flex flex-col gap-1'>
                                            <div className="text-sm sm:text-base font-medium  text-[#777D7F]">Event status </div>
                                            <div className="text-muted-foreground text-sm text-slate-700 font-semibold">{(data?.is_canceled) ? "canceled" : "Ongoing"}</div>
                                        </div>
                                    </div>

                                </div>
                                <div className='flex flex-col gap-4 mt-4 w-[50%]'>
                                    <div className="flex items-start gap-4 sm:gap-6">
                                        <Tags className="w-6 h-6 text-muted-foreground text-d eep-blue" />
                                        <div className='flex flex-col gap-1'>
                                            <div className="text-sm sm:text-base font-medium  text-[#777D7F]">Total Tickets  </div>
                                            <div className="text-muted-foreground text-sm text-slate-700 font-semibold">{String(data?.total_tickets)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 sm:gap-6">
                                        <TicketMinus className="w-6 h-6 text-muted-foreground text-deep-blu e" />
                                        <div className='flex flex-col gap-1'>
                                            <div className="text-sm sm:text-base font-medium  text-[#777D7F]">Total Ticket Sold  </div>
                                            <div className="text-muted-foreground text-sm text-slate-700 font-semibold">{String(data?.tickets_sold)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 sm:gap-6">
                                        <TicketCheck className="w-6 h-6 text-muted-foreground text-deep-blu e" />
                                        <div className='flex flex-col gap-1'>
                                            <div className="text-sm sm:text-base font-medium  text-[#777D7F]">Total Ticket Available </div>
                                            <div className="text-muted-foreground text-sm text-slate-700 font-semibold">{String(data?.total_tickets - data?.tickets_sold)}</div>
                                        </div>
                                    </div>
                                    {
                                        address === `0x${data?.organizer.toString(16)}` ?
                                            <>
                                                <div className="flex items-start gap-4 sm:gap-6">
                                                    <HandCoins className="w-6 h-6 text-muted-foreground text-[#777D7F]" />
                                                    <div className='flex flex-col gap-1'>
                                                        <div className="text-sm sm:text-base font-medium  text-[#777D7F]">Total Amount  </div>
                                                        <div className="text-muted-foreground text-sm text-slate-700 font-semibold">{String(data?.ticket_price * data?.tickets_sold).slice(0, -18)} STRK</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-8">
                                                    <RescheduleDialog id={id} />

                                                    <Button onClick={cancelEvent} size="lg" className="w-full max-w-md text-primary bg-deep-blue hover:bg-primary hover:text-deep-blue">
                                                        Cancel Event
                                                    </Button>
                                                </div></> :
                                            <div className="flex">
                                                {Number(userTicket) === 0 ? <div className='flex gap-2'>
                                                    <Button onClick={handleApprove} size="lg" className="w-full max-w-md text-primary bg-deep-blue hover:bg-primary hover:text-deep-blue">
                                                        Give app approval
                                                    </Button>
                                                    <Button onClick={handleSubmit} size="lg" className="w-full max-w-md text-primary bg-deep-blue hover:bg-primary hover:text-deep-blue">
                                                        Get ticket
                                                    </Button>
                                                </div>
                                                    : <div className='flex gap-3'>{
                                                        (data?.is_canceled) && !reclaimed &&
                                                        <Button onClick={claim_ticket_refund} size="lg" className="w-full max-w-md text-primary bg-deep-blue hover:bg-primary hover:text-deep-blue">
                                                            Reclaim ticket refund
                                                        </Button> }
                                                        <TicketDialog theme={feltToString(data?.theme)} startDate={startDateResponse.dateTime} endDate={endDateResponse.dateTime} location={feltToString(data?.event_type)} id={id} deployAccount={deployAccount} getStatus={getStatus} getAccount={getAccount} tba={tba} />
                                                    </div>
                                                }
                                            </div>
                                    }
                                </div>
                            </div>

                        </div>
                    </div>
                    <a href={`https://sepolia.voyager.online/contract/0x${data?.event_ticket_addr.toString(16)}`} target="_blank" rel="noopener noreferrer" className='underline text-blue-700 text-center w-full flex items-center justify-end pr-10 my-2'> View tickets NFT address</a>

                </Card>
            )}

        </Layout>
    )
}

export default EventDetails