import React, { useContext } from 'react'
import Layout from '../../Components/dashboard/layout'
import { KitContext } from '../../context/kit-context'
import { useState, useEffect } from 'react'
import { useContractRead } from '@starknet-react/core'
import DashboardAnalytics from '../../Components/dashboard/dashboard-analytics'
import RecentActivities from '../../Components/dashboard/recent-activities'

const Dashboard = () => {
  const {address, account, contract, eventAbi, contractAddr} = useContext(KitContext)
  console.log(account)

  const { data, isError, isLoading, error } = useContractRead({
    functionName: "get_event_count",
    args: [],
    abi: eventAbi,
    address: contractAddr,
    watch: true,
  });


// console.log(data.toString())
  return (
    <Layout>
      {/* <button onClick={disconnectWallet}>connect</button> */}
      <DashboardAnalytics eventHosted={"0"} eventAttended={"0"} poa={"0"} totalEvents={"0"}/>
      <RecentActivities />
      {/* <h4>{address || 'nil'}</h4> */}
      {/* {contract?.address}

      {isLoading && <h4>loading ....</h4>}
      { isError || ! data && <div>{error?.message}</div>}
      {data && data} */}

    </Layout>
  )
}

export default Dashboard