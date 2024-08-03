import React from 'react'
import { Carousel, CarouselContent, CarouselItem } from '../carousel'

const UpcomingSection = () => {

    // const [api, setApi] = React.useState()
    // const [current, setCurrent] = React.useState(0)
    // const [count, setCount] = React.useState(0)

    // React.useEffect(() => {
    //     if (!api) {
    //         return
    //     }

    //     setCount(api.scrollSnapList().length)
    //     setCurrent(api.selectedScrollSnap() + 1)

    //     api.on("select", () => {
    //         setCurrent(api.selectedScrollSnap() + 1)
    //     })
    // }, [api])

    return (
        <div className='bg-white flex flex-col justify-center items-center py-6 my-10'>
            <h1 className='text-deep-blue text-6xl font-bold pt-16 pb-20'>Upcoming Events</h1>
            <div className='flex justify-center items-center gap-4'>
                <img src="/assets/left-arrow.png" />
                <div className='max-w-[1280px]'>
                    <div className='bg-deep-blue rounded-lg flex gap-12 py-10 px-20 2xl:p-20 '>
                        <img src="/assets/web3lagos-conference.png" alt="web3-lagos" className='h-[350px] w-[420px] 2xl:h-[490px] 2xl:w-[566px]'/>
                        <div className='flex flex-col justify-between'>
                            <div className='flex flex-col'>
                                <p className='text-lg text-base-white'>Africa’s largest blockchain gathering</p>
                                <h1 className='text-3xl text-primary'>Web3 Lagos Conference</h1>
                            </div>
                            <div className='flex flex-col gap-4 mb-6'>
                                <p className='text-base-white text-2xl font-medium'>Event starts in</p>
                                <div className='flex gap-8 justify-between items-center'>
                                    <div className='flex flex-col'>
                                        <div className='bg-[#D9D9D9] p-6 rounded-md'>
                                            <p className='text-primary text-6xl font-medium'>72</p>
                                        </div>
                                    </div>
                                    <h1 className='text-white text-6xl font-medium'>:</h1>
                                    <div className='flex flex-col'>
                                        <div className='bg-[#D9D9D9] p-6 rounded-md'>
                                            <p className='text-primary text-6xl font-medium'>72</p>
                                        </div>
                                    </div>
                                    <h1 className='text-white text-6xl font-medium'>:</h1>
                                    <div className='flex flex-col'>
                                        <div className='bg-[#D9D9D9] p-6 rounded-md'>
                                            <p className='text-primary text-6xl font-medium'>72</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='flex justify-between items-center'>
                                <div className='flex flex-col gap-3'>
                                    <div className='flex items-center -space-x-8'>
                                        <img src='/assets/event-attendee-one.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                        <img src='/assets/event-attendee-two.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                        <img src='/assets/event-attendee-three.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                        <img src='/assets/event-attendee-four.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                        <img src='/assets/event-attendee-five.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                    </div>
                                    <p className='text-xl font-bold text-white'>
                                        100+ Attending
                                    </p>
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <p className='text-xl text-base-white'>Powered by:</p>
                                    <p className='text-xl text-base-white'>Web3bridge</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <img src="/assets/right-arrow.png" />
            </div>


            {/* <Carousel setApi={setApi}>
                <CarouselContent>
                    <CarouselItem>
                        <div className='max-w-[1280px]'>
                            <div className='bg-deep-blue rounded-lg flex gap-12 p-20'>
                                <img src="/assets/web3lagos-conference.png" alt="web3-lagos" />
                                <div className='flex flex-col justify-between mb-6'>
                                    <div className='flex flex-col'>
                                        <p className='text-lg text-base-white'>Africa’s largest blockchain gathering</p>
                                        <h1 className='text-3xl text-primary'>Web3 Lagos Conference</h1>
                                    </div>
                                    <div className='flex flex-col gap-4'>
                                        <p className='text-base-white text-2xl font-medium'>Event starts in</p>
                                        <div className='flex gap-8 justify-between items-center'>
                                            <div className='flex flex-col'>
                                                <div className='bg-[#D9D9D9] p-6 rounded-md'>
                                                    <p className='text-primary text-6xl font-medium'>72</p>
                                                </div>
                                            </div>
                                            <h1 className='text-white text-6xl font-medium'>:</h1>
                                            <div className='flex flex-col'>
                                                <div className='bg-[#D9D9D9] p-6 rounded-md'>
                                                    <p className='text-primary text-6xl font-medium'>72</p>
                                                </div>
                                            </div>
                                            <h1 className='text-white text-6xl font-medium'>:</h1>
                                            <div className='flex flex-col'>
                                                <div className='bg-[#D9D9D9] p-6 rounded-md'>
                                                    <p className='text-primary text-6xl font-medium'>72</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='flex justify-between items-center'>
                                        <div className='flex flex-col gap-3'>
                                            <div className='flex items-center -space-x-8'>
                                                <img src='/assets/event-attendee-one.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                                <img src='/assets/event-attendee-two.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                                <img src='/assets/event-attendee-three.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                                <img src='/assets/event-attendee-four.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                                <img src='/assets/event-attendee-five.png' alt='attendee' className='rounded-full' width={80} height={80} />
                                            </div>
                                            <p className='text-xl font-bold text-white'>
                                                100+ Attending
                                            </p>
                                        </div>
                                        <div className='flex flex-col gap-1'>
                                            <p className='text-xl text-base-white'>Powered by:</p>
                                            <p className='text-xl text-base-white'>Web3bridge</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CarouselItem>
                </CarouselContent>
            </Carousel> */}

        </div>
    )
}

export default UpcomingSection