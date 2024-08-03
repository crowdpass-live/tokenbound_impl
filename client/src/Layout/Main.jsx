import { Outlet } from "react-router-dom";
import React, { useState, useEffect } from 'react'
import { connect, disconnect } from 'starknetkit'
import LandingPage from "../pages/static/landing-page";
import Layout from "../Components/dashboard/layout";

function Main() {

  return (
    <div>
        {/* {address ? 'connected' : <LandingPage connect={connectWallet} disconnect={disconnectWallet}/>} */}
        <Layout/>
    </div>
  )
}

export default Main