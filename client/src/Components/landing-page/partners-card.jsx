import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'
import { Button } from '../shared/button'

const PartnersCard = () => {
    return (
        <div className='p-8 flex flex-col bg-deep-blue gap-12 max-w-[620px] justify-center'>
            <h1 className='font-semibold text-4xl text-primary'>Partners</h1>
            <div className='flex flex-wrap gap-2'>
                <img src="/assets/partners-web3bridge.png" alt="web3bridge" className='min-w-52' />
                <img src="/assets/partners-starknet.png" alt="starknet" className='min-w-52' />
                <img src="/assets/partners-tokenbound.png" alt="tokenbound" className='min-w-52' />
                <img src="/assets/partners-voyager.png" alt="voyager" className='min-w-52' />
            </div>
            <div className='w-full flex justify-end items-center gap-4'>
                <div className='flex gap-4'>
                    <Button size="icon">
                        <ChevronLeft size={32} className="text-deep-blue font-bold bg-primary" />
                    </Button>
                    <Button size="icon">
                        <ChevronRight size={32} className=" text-deep-blue bg-primary" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default PartnersCard