import React from 'react'
import { NavLink } from 'react-router-dom'

const SidebarItem = ({ menu }) => {
 
  return (
    <NavLink to={menu.url} className={`${({isActive})=>(isActive ? 'bg-primary' : '')}`}>
    <div className= {`normalLink py-3 px-10 mt-2 flex items-center rounded-l-full`}>
      <div >{menu.icon}</div>
      <div className="ml-4 text-lg font-semibold">{menu.title}</div>
    </div>
  </NavLink>
  )
}

export default SidebarItem