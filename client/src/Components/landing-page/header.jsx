import React, { useContext } from 'react'
import { Button } from '../shared/button'
import { KitContext } from '../../context/kit-context'

const Header = () => {

  const {connect, connectors, address, account} = useContext(KitContext)

  return (
    <div className='rounded-full bg-white/70 flex justify-between items-center py-5 px-10 w-full'>
        <img src='/assets/hostit-logo.png' height={30} width={150} />
        <div>
        <Button variant="link" className="text-black text-lg">Popular Events</Button>
        <Button variant="link" className="text-black text-lg">Analytics</Button>
        </div>
        <div className='flex gap-4'>
        <ul className='flex gap-4'>
          {connectors.map((connector) => (
            <li key={connector.id}>
              <Button onClick={() => connect({ connector })} variant="outline" className="text-deep-blue border-deep-blue px-8">Connect {connector.name}</Button>
            </li>
          ))}
        </ul>
            
            {/* <Button className="bg-deep-blue text-white px-8">Sign In</Button> */}
        </div>
    </div>
  )
}

export default Header