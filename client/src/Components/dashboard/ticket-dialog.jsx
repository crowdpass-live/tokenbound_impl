import React from 'react'
import QRCode from "react-qr-code";
import { Button } from "../shared/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../shared/dialog"

import strkAbi from '../../Abis/strkAbi.json'
import { useContractRead } from '@starknet-react/core';
import { TransferDialog } from './transfer-dialogue';

const TicketDialog = ({ theme, startDate, endDate, location, id, deployAccount, tba, getAccount }) => {

    const { data, isError, isLoading, error } = useContractRead({
        functionName: "balance_of",
        args: [tba],
        abi: strkAbi,
        address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        watch: true,
    });

    console.log(data)

    const strkBalance = Number(data?.toString())/1e18
    return (
        <div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant={"outline"} size="lg" className="w-full max-w-md  border border-deep-blue text-deep-blue hover:bg-deep-blue hover:text-primary">
                        View ticket
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-base-white">
                    <div className="bg-white rounded-lg my-3 m-1 p-3 w-full max-w-md shadow-2xl">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold">{theme}</h2>
                                <p className="text-gray-500 ">{`${startDate} - ${endDate}`}</p>
                                <p className="text-gray-500 ">{location}</p>
                            </div>
                            <div className="w-full max-w-[200px]">
                                <QRCode
                                    size={200}
                                    bgColor="transparent"
                                    fgColor="black"
                                    value={`https://collectors.poap.xyz/drop/172874`}
                                />
                            </div>
                                <div className='flex items-center gap-1'>
                                    <h2 className='font-medium text-[#777D7F]'>TBA Balance: </h2>
                                    <h4 className='text-slate-700 font-semibold'>{strkBalance} STRK</h4>
                                    <TransferDialog tba={tba}/>
                                </div> 
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={getAccount}>get Assets</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default TicketDialog