import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../shared/button'
import { Card } from "../shared/card"

const ComingSoon = () => {
    return (
        <div className='flex text-center justify-center items-center flex-col w-full h-[calc(100vh-130px)] gap-2 '>
                <h1 className='text-deep-blue text-6xl font-bold'>Coming soon!</h1>
                <Link to={"/events"}> <Button variant="link" className="text-deep-blue hover:text-primary text-xl underline">Explore our events</Button></Link>
        </div>
    )
}

export default ComingSoon