import React from 'react'
import { Button } from '../shared/button'
import { BsSendFill } from "react-icons/bs";
import { Link } from "react-router-dom"

const Footer = () => {
  return (
    <div className='bg-white flex flex-col justify-center items-center py-6 my-10'>
      <div className='flex flex-col max-w-[1280px] xl:w-[1280px] gap-8'>
        <div className='flex gap-6 w-full justify-between items-start'>
          <div className='flex flex-col gap-3 w-[430px]'>
            <img src='/assets/hostit-logo.png' height={30} width={150} />
            <p className='text-[#777D7F] pt-3'>Welcome to CrowdPass, your ultimate event management platform. We empower event organizers to create, manage, and promote their events with ease.</p>
            <div className='p-2 border rounded-md border-deep-blue flex gap-3 '>
              <input type="text" placeholder='Enter email to subsribe to our newsletter' className='border-none' />
              <Button className="text-primary bg-deep-blue hover:text-deep-blue">
                <BsSendFill />
              </Button>
            </div>
          </div>
          <div className='flex gap-10'>
            <div className='flex flex-col gap-6'>
              <h1 className='font-bold text-xl  text-deep-blue'>
                Quick Links
              </h1>
              <div className='flex flex-col gap-6'>
                <Link to="#" className='text-[#777D7F] hover:underline'>Home</Link>
                <Link to="#" className='text-[#777D7F] hover:underline'>About</Link>
                <Link to="#" className='text-[#777D7F] hover:underline'>Contact</Link>
              </div>
            </div>
            <div className='flex flex-col gap-6'>
              <h1 className='font-bold text-xl text-deep-blue'>
                Quick Links
              </h1>
              <div className='flex flex-col gap-6'>
                <Link to="#" className='text-[#777D7F] hover:underline'>Get Started</Link>
                <Link to="#" className='text-[#777D7F] hover:underline'>Term & Conditions</Link>
                <Link to="#" className='text-[#777D7F] hover:underline'>Privacy policy</Link>
              </div>
            </div>
            <div className='flex flex-col gap-6'>
              <h1 className='font-bold text-xl text-deep-blue'>
                Quick Links
              </h1>
              <div className='flex flex-col gap-6'>
                <Link to="#" className='text-[#777D7F] hover:underline'>Create event</Link>
                <Link to="#" className='text-[#777D7F] hover:underline'>Explore events</Link>
                <Link to="#" className='text-[#777D7F] hover:underline'>Get POAP</Link>
                <Link to="#" className='text-[#777D7F] hover:underline'>Attend Event</Link>
              </div>
            </div>
          </div>
        </div>
        <hr />
        <div className='flex gap-6 w-full justify-between items-center'>
          <div className='flex gap-2'>
            <img src='/assets/copyright.png' alt='copyright'/>
            <p className='text-lg'>All Rights Reserved, CrowdPass 2024.</p>
          </div>
          <div className='flex gap-3'>
          <img src='/assets/facebook-icon.png' alt='facebook-icon'/>
          <img src='/assets/instagram-icon.png' alt='instagram-icon'/>
          <img src='/assets/youtube-icon.png' alt='youtube-icon'/>
          <img src='/assets/x-icon.png' alt='x-icon'/>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Footer