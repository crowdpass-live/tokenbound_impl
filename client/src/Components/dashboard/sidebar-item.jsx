import React from 'react'
import { NavLink } from 'react-router-dom'

const SidebarItem = ({ menu }) => {
 
  return (
    <NavLink to={menu.url} className={({isActive})=> `block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-deep-blue rounded-l-full ${isActive ? 'bg-primary' : ''}`}>
    <div className={`normalLink py-3 px-10 mt-2 flex items-center rounded-l-full`}>
      <div aria-hidden="true">{menu.icon}</div>
      <div className="ml-4 text-lg font-semibold">{menu.title}</div>
    </div>
  </NavLink>
  )
}

export default SidebarItem