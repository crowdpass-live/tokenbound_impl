import React, { useContext, useEffect, useState } from 'react'
import { useContractRead } from '@starknet-react/core'
import { KitContext } from '../../context/kit-context'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/card'
import { Badge } from '../shared/badge'
import { Button } from '../shared/button'
import { CalendarIcon, ClockIcon, MapPinIcon, Ticket, Wallet, QrCode, Send, RefreshCw } from 'lucide-react'
import { epochToDatetime } from 'datetime-epoch-conversion'
import { feltToString } from '../../helpers'
import QRCode from 'react-qr-code'
import { TokenboundClient } from 'starknet-tokenbound-sdk'
import { TransferDialog } from './transfer-dialogue'
import toast from 'react-hot-toast'
import strkAbi from '../../Abis/strkAbi.json'

const TicketWallet = () => {
    const { address, account, contract, eventAbi, contractAddr, eventContract, readEventContract } = useContext(KitContext)
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [tbaData, setTbaData] = useState({})

    // Tokenbound client setup
    const options = {
        account: account,
        registryAddress: `0x4101d3fa033024654083dd982273a300cb019b8cb96dd829267a4daf59f7b7e`,
        implementationAddress: `0x45d67b8590561c9b54e14dd309c9f38c4e2c554dd59414021f9d079811621bd`,
        jsonRPC: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/RCp5m7oq9i9myxsvC8ctUmNq2Wq2Pa_v`
    }

    let tokenbound
    if (account) {
        tokenbound = new TokenboundClient(options)
    }

    // Fetch event count
    const { data: eventCount, isLoading: eventsLoading } = useContractRead({
        functionName: "get_event_count",
        args: [],
        abi: eventAbi,
        address: contractAddr,
        watch: true,
    })

    // Fetch user's tickets for each event
    useEffect(() => {
        const fetchUserTickets = async () => {
            if (!eventCount || !address) return

            setLoading(true)
            const userTickets = []
            const count = Number(eventCount)

            for (let i = 0; i < count; i++) {
                try {
                    const ticketData = await readEventContract.user_event_ticket(i, address)
                    if (Number(ticketData) > 0) {
                        const eventData = await readEventContract.get_event(i)
                        userTickets.push({
                            eventId: i,
                            ticketId: Number(ticketData),
                            event: eventData
                        })
                    }
                } catch (error) {
                    console.log(`Error fetching ticket for event ${i}:`, error)
                }
            }

            setTickets(userTickets)
            setLoading(false)
        }

        fetchUserTickets()
    }, [eventCount, address])

    // Fetch TBA balance for each ticket
    useEffect(() => {
        const fetchTBABalances = async () => {
            if (!tickets.length || !tokenbound) return

            const balances = {}
            for (const ticket of tickets) {
                try {
                    const account = await tokenbound.getAccount({
                        tokenContract: `0x${ticket.event.event_ticket_addr.toString(16)}`,
                        tokenId: ticket.ticketId,
                        salt: ticket.ticketId
                    })

                    const tbaAddress = `0x${account.toString(16)}`
                    
                    // Fetch STRK balance
                    const balanceData = await readEventContract.balance_of(tbaAddress)
                    const strkBalance = Number(balanceData?.toString()) / 1e18

                    balances[ticket.ticketId] = {
                        address: tbaAddress,
                        strkBalance: strkBalance
                    }
                } catch (error) {
                    console.log(`Error fetching TBA for ticket ${ticket.ticketId}:`, error)
                }
            }

            setTbaData(balances)
        }

        fetchTBABalances()
    }, [tickets])

    const claimRefund = async (eventId) => {
        const toast1 = toast.loading('Claiming refund...')
        try {
            await eventContract.claim_ticket_refund(eventId)
            toast.remove(toast1)
            toast.success('Refund claimed successfully')
        } catch (error) {
            toast.remove(toast1)
            toast.error(error.message)
        }
    }

    const getStatusBadge = (event) => {
        if (event.is_canceled) {
            return <Badge variant="destructive">Cancelled</Badge>
        }
        const now = Math.floor(Date.now() / 1000)
        if (Number(event.start_date) > now) {
            return <Badge variant="secondary">Upcoming</Badge>
        }
        if (Number(event.end_date) < now) {
            return <Badge variant="outline">Ended</Badge>
        }
        return <Badge variant="default">Ongoing</Badge>
    }

    if (loading || eventsLoading || !eventCount) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-deep-blue" />
                    <p className="text-gray-600">Loading your tickets...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-deep-blue">My Ticket Wallet</h1>
                    <p className="text-gray-600 mt-1">View and manage your NFT tickets and Token Bound Accounts</p>
                </div>
                <div className="flex items-center gap-2 bg-deep-blue/10 px-4 py-2 rounded-lg">
                    <Wallet className="w-5 h-5 text-deep-blue" />
                    <span className="font-semibold text-deep-blue">{tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Tickets Grid */}
            {tickets.length === 0 ? (
                <Card className="shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Ticket className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Tickets Yet</h3>
                        <p className="text-gray-500 text-center max-w-md">
                            You don&apos;t have any NFT tickets yet. Browse events and purchase tickets to see them here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map((ticket) => {
                        const startDate = epochToDatetime(String(ticket.event.start_date))
                        const endDate = epochToDatetime(String(ticket.event.end_date))
                        const tba = tbaData[ticket.ticketId]
                        const eventName = feltToString(ticket.event.theme)
                        const location = feltToString(ticket.event.event_type)

                        return (
                            <Card key={ticket.ticketId} className="shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                                {/* Event Image */}
                                <div className="relative h-40 bg-gradient-to-br from-deep-blue to-purple-600">
                                    <img
                                        src="/assets/about-image-podcast.jpg"
                                        alt={eventName}
                                        className="w-full h-full object-cover opacity-50"
                                    />
                                    <div className="absolute inset-0 bg-black/30" />
                                    <div className="absolute top-4 right-4">
                                        {getStatusBadge(ticket.event)}
                                    </div>
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <h3 className="text-xl font-bold text-white truncate">{eventName}</h3>
                                    </div>
                                </div>

                                <CardContent className="p-5 space-y-4">
                                    {/* Event Details */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <CalendarIcon className="w-4 h-4" />
                                            <span>{startDate.dateTime}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{endDate.dateTime}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <MapPinIcon className="w-4 h-4" />
                                            <span>{location}</span>
                                        </div>
                                    </div>

                                    {/* TBA Info */}
                                    {tba && (
                                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-500">Token Bound Account</span>
                                                <span className="text-xs font-mono text-gray-600 truncate max-w-[150px]">
                                                    {tba.address.slice(0, 6)}...{tba.address.slice(-4)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-500">STRK Balance</span>
                                                <span className="text-sm font-semibold text-deep-blue">
                                                    {tba.strkBalance.toFixed(4)} STRK
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* QR Code */}
                                    <div className="flex justify-center py-3">
                                        <div className="bg-white p-3 rounded-lg shadow-inner">
                                            <QRCode
                                                size={120}
                                                bgColor="transparent"
                                                fgColor="black"
                                                value={`https://crowdpass.live/checkin/${ticket.eventId}/${ticket.ticketId}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        {ticket.event.is_canceled && (
                                            <Button
                                                onClick={() => claimRefund(ticket.eventId)}
                                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Claim Refund
                                            </Button>
                                        )}
                                        
                                        {tba && (
                                            <TransferDialog tba={tba.address} />
                                        )}

                                        <Button
                                            variant="outline"
                                            className="w-full border-deep-blue text-deep-blue hover:bg-deep-blue hover:text-white"
                                            onClick={() => window.open(`https://sepolia.voyager.online/contract/0x${ticket.event.event_ticket_addr.toString(16)}`, '_blank')}
                                        >
                                            <Ticket className="w-4 h-4 mr-2" />
                                            View NFT Contract
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Summary Stats */}
            {tickets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <Card className="shadow-md">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Ticket className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Tickets</p>
                                    <p className="text-2xl font-bold text-deep-blue">{tickets.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-md">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Wallet className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Active TBAs</p>
                                    <p className="text-2xl font-bold text-deep-blue">{Object.keys(tbaData).length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-md">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <QrCode className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Ready for Check-in</p>
                                    <p className="text-2xl font-bold text-deep-blue">
                                        {tickets.filter(t => !t.event.is_canceled).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

export default TicketWallet
