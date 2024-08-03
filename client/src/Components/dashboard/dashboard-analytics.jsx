import { BriefcaseIcon, CalendarIcon, TrophyIcon, UsersIcon } from 'lucide-react'
import React from 'react'
import { Card } from '../shared/card'

const DashboardAnalytics = ({eventHosted, eventAttended, poa, totalEvents}) => {
    return (
        <div className="flex flex-wrap gap-8 items-center">
            <Card className="bg-deep-blue shadow-xl rounded-lg p-6 flex flex-col items-start gap-4 min-w-64">
                <div className="flex items-center gap-4">
                    <CalendarIcon className="h-8 w-8 text-primary" />
                    <div className="text-3xl text-primary font-bold ">{eventHosted}</div>
                </div>
                <p className="text-primary">Events Hosted</p>
            </Card>
            <Card className="bg-primary shadow-xl rounded-lg p-6 flex flex-col items-start gap-4 min-w-64">
                <div className="flex items-center gap-4">
                    <UsersIcon className="h-8 w-8 text-deep-blue" />
                    <div className="text-3xl font-bold text-deep-blue ">{eventAttended}</div>
                </div>
                <p className="text-deep-blue">Events Attended</p>
            </Card>
            <Card className="bg-deep-blue shadow-xl rounded-lg p-6 flex flex-col items-start gap-4 min-w-64">
                <div className="flex items-center gap-4">
                    <TrophyIcon className="h-8 w-8 text-primary" />
                    <div className="text-3xl font-bold text-primary ">{poa}</div>
                </div>
                <p className="text-primary">POAPs Collected</p>
            </Card>
            <Card className="bg-primary shadow-xl rounded-lg p-6 flex flex-col items-start gap-4 min-w-64">
                <div className="flex items-center gap-4">
                    <BriefcaseIcon className="h-8 w-8 text-deep-blue" />
                    <div className="text-3xl font-bold text-deep-blue ">{totalEvents}</div>
                </div>
                <p className="text-deep-blue">Total Events</p>
            </Card>
        </div>
    )
}

export default DashboardAnalytics