import { Activity, FolderOpen, Mail, Ticket, Trash } from 'lucide-react'
import React from 'react'
import { BiMoneyWithdraw, BiRegistered } from 'react-icons/bi'
import { FaMoneyBill } from 'react-icons/fa'
import { TiCancel } from 'react-icons/ti'

const RecentActivities = () => {
    const activities = [
        {
            icon: <Ticket size={16} />,
            notification: "You bought an event ticket",
        },
        {
            icon: <BiRegistered size={16} />,
            notification: "You registered for an event",
        },
        {
            icon: <FolderOpen size={16} />,
            notification: "You Created an event",
        },
        {
            icon: <TiCancel size={16} />,
            notification: "You cancel an event ticket",
        },
        {
            icon: <BiMoneyWithdraw size={16} />,
            notification: "You reclaimed your ticket fee",
        },
        {
            icon: <FaMoneyBill size={16} />,
            notification: "You sold an event ticket",
        },
    ]

    const activitiesMap = activities.map(({ icon, notification }, index) => {
        return (
            <li className="flex justify-between items-center px-4 py-4 border-b-2 hover:bg-gray-100 hover:py-6 transition duration-300" key={index}>
                <div className="flex items-center text-base font-normal gap-2 text-deep-blue">
                    {icon} {notification}
                </div>
            </li>
        )
    })
    return (
        <div className="col-span-12 my-8">
            <div className="bg-white rounded shadow-2xl p-4">
                <div className="flex justify-between items-center border-b-4 p-4">
                    <h4 className="text-xl font-semibold flex gap-2 text-deep-blue">
                        <Activity /> Recent Activities
                    </h4>
                </div>
                <div>
                    <ul>
                        {activitiesMap}
                    </ul>
                </div>
            </div>
        </div>)
}

export default RecentActivities