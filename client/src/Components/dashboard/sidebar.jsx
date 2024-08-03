import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import SidebarItem from './sidebar-item'
import { IoLogOutSharp, IoTicket } from 'react-icons/io5'
import { TiHome } from 'react-icons/ti'
import { FaCompass, FaFolderOpen } from 'react-icons/fa'
import { IoIosSettings, IoMdAnalytics } from 'react-icons/io'
import { KitContext } from '../../context/kit-context'

const Sidebar = () => {

    const { connect, connectors, address, account, disconnect } = useContext(KitContext)

    const eventMainSidebarData = [
        {
            url: "/dashboard",
            icon: <TiHome className="w-6 h-6" />,
            title: "Dashboard"
        }, {
            url: "/events",
            icon: <FaFolderOpen className="w-6 h-6" />,
            title: "Events"
        }, {
            url: "/tickets",
            icon: <IoTicket className="w-6 h-6" />,
            title: "Tickets"
        },
        {
            url: "/analytics",
            icon: <IoMdAnalytics className="w-6 h-6" />,
            title: "Analytics"
        }, {
            url: "/discover",
            icon: <FaCompass className="w-6 h-6" />,
            title: "Discover"
        }, {
            url: "/settings",
            icon: <IoIosSettings className="w-6 h-6" />,
            title: "Settings"
        },
    ]

    return (
        <div className="hidden h-screen w-64 md:block fixed bg-deep-blue">
            <div className='flex flex-col py-2 2xl:py-6 justify-between h-screen'>
                <div className='flex flex-col gap-10'>
                    <div className="my-2 mx-6 flex items-center">
                        <Link to="/" className="flex items-center">
                            <img src="/assets/hostit-logo-light.png" alt="logo" width={150} height={36} />
                        </Link>
                    </div>
                    <div className="">
                        {eventMainSidebarData.map((menu, index) => (
                            <SidebarItem key={index} menu={menu} />
                        ))}
                    </div>
                </div>
                <div className='flex flex-col gap-8 mx-3'>
                    <hr className='h-[2px] bg-primary w-56' />
                    <div className='flex gap-3'>
                        <img src='/assets/profile-picture.png' alt='profile-picture' width={71} height={63} />
                        <div className='flex flex-col gap-2 justify-center'>
                            <p className='text-base text-white font-normal'>{address.slice(0, 5)}*****{address.slice(61, 65)}</p>
                            <p className='text-base text-white font-normal'>0xgabriel.eth</p>
                        </div>
                    </div>
                    <div>
                        <button onClick={() => disconnect()} className={`normalLink py-3 px-10 mt-2 flex items-center rounded-l-full`}>
                            <div ><IoLogOutSharp className="w-6 h-6" /></div>
                            <h4 className="ml-4 text-lg font-semibold">Log Out</h4>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Sidebar