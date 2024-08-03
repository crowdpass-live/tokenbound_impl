import React, { useContext } from 'react'
import Sidebar from './sidebar'
import Navbar from './navbar'
import { KitContext } from '../../context/kit-context'

 

const Layout = ({ children }) => {

  return (
    <div className="bg-deep-blue w-screen md:w-full flex overflow-x-hidden min-h-screen" >
      <Sidebar />
      <div className="md:ml-64 grow bg-base-white rounded-l-[80px] pl-20 py-6 pr-10 h-screen">
        <div className='overflow-y-auto h-full'>
        <Navbar />
        {children}
        </div>
      </div>
    </div>
  )
}

export default Layout