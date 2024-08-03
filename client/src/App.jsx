import React from 'react'
import { Routes, Route } from "react-router-dom"
import LandingPage from './pages/static/landing-page'
import Dashboard from './pages/dashboard/dashboard'
// import Test from './Components/test'
import Analytics from './pages/dashboard/analytics'
import Discover from './pages/dashboard/discover'
import Events from './pages/dashboard/events'
import Settings from './pages/dashboard/settings'
import Tickets from './pages/dashboard/tickets'
import EventDetails from './pages/dashboard/event-details'
import { KitContext } from './context/kit-context'
import { StarknetProvider } from './context/starknet-provider'
import { useConnect, useDisconnect } from "@starknet-react/core";
import { useAccount } from "@starknet-react/core";
import CreateEvent from './pages/dashboard/create-event'
import { useContract } from "@starknet-react/core";
import { Contract, RpcProvider } from 'starknet'
import eventAbi from './Abis/eventAbi.json'
import strkAbi from './Abis/strkAbi.json'


const App = () => {
  // '0x020e084281a8b2c1d390ca95f0b4644b418066c5865da48745ee2923fc7693d5'
  const token_addr = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
  const contractAddr = '0x767b1f18bcfe9f131d797fdefe0a5adc8d268cf67d0b3f02122b3e56f3aa38d';
  const { connect, connectors } = useConnect();
  const { account, address, status} = useAccount();
  const { disconnect } = useDisconnect();
  const { contract } = useContract({ abi: eventAbi, address: contractAddr, provider: account})
  const providers = new RpcProvider({
    nodeUrl: 'https://free-rpc.nethermind.io/sepolia-juno/',
  });

  const eventContract = new Contract(eventAbi, contractAddr, account)
  const readEventContract = new Contract(eventAbi, contractAddr, providers)
  const strkContract = new Contract(strkAbi, token_addr, account)


  return (
    <StarknetProvider>
      <KitContext.Provider value={{connect, disconnect, connectors, address, account, contract, contractAddr, eventAbi, eventContract, readEventContract, strkContract}}>
      <Routes>
        <Route path="/" element={status == 'disconnected' ? <LandingPage /> : <Dashboard />} />
        <Route path="/dashboard" element={status == 'disconnected' ? <LandingPage /> : <Dashboard />} />
        <Route path="/analytics" element={status == 'disconnected' ? <LandingPage /> : <Analytics />} />
        <Route path="/discover" element={status == 'disconnected' ? <LandingPage /> : <Discover />} />
        <Route path="/events" element={status == 'disconnected' ? <LandingPage /> : <Events />} />
        <Route path="/events/:id" element={status == 'disconnected' ? <LandingPage /> : <EventDetails />} />
        <Route path="/create-events" element={status == 'disconnected' ? <LandingPage /> : <CreateEvent />} />
        <Route path="/settings" element={status == 'disconnected' ? <LandingPage /> : <Settings />} />
        <Route path="/tickets" element={status == 'disconnected' ? <LandingPage /> : <Tickets />} />
        {/* <Route path="/test" element={<Test />} /> */}
        {/* <Toaster /> */}
      </Routes>
    </KitContext.Provider>
    </StarknetProvider>
  )
}

export default App