// import { useState, useEffect } from 'react'
// import { connect, disconnect } from 'starknetkit'
// import { TokenboundClient } from 'starknet-tokenbound-sdk';

// function Test() {

//   const [connection, setConnection] = useState();
//   const [provider, setProvider] = useState();
//   const [address, setAddress] = useState();

//   const [formData, setFormData] = useState({
//     tokenContract: '',
//     tokenId: ''
//   })

//   const inputChange = (e) => {
//     setFormData((prevState) => ({
//       ...prevState, [e.target.name]: e.target.value
//     }))
//   }

//   // let tokenContract = '0x050a6499d646569d14d990521f00bf320871a677e588b8eaa18d7eca8ff5a9ea';
//   // let tokenId = 1;

//   // wallet connection
//   const connectWallet = async () => {
//     const { wallet } = await connect();

//     if (wallet && wallet.isConnected) {
//       setConnection(wallet)
//       setProvider(wallet.account)
//       setAddress(wallet.selectedAddress)
//     }
//   }

//   //  wallet disconnect
//   const disconnectWallet = async () => {

//     await disconnect({ clearLastWallet: true });

//     setConnection(undefined);
//     setProvider(undefined);
//     setAddress('');
//   }

//   useEffect(() => {

//     const connectToStarknet = async () => {

//       const { wallet } = await connect({ modalMode: "neverAsk" })

//       if (wallet && wallet.isConnected) {
//         setConnection(wallet);
//         setProvider(wallet.account);
//         setAddress(wallet.selectedAddress);
//       }
//     };

//     connectToStarknet();
//   }, [])

//   const options = {
//     account: provider,
//     registryAddress: `0x4101d3fa033024654083dd982273a300cb019b8cb96dd829267a4daf59f7b7e`,
//     implementationAddress: `0x45d67b8590561c9b54e14dd309c9f38c4e2c554dd59414021f9d079811621bd`,
//     jsonRPC: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/RCp5m7oq9i9myxsvC8ctUmNq2Wq2Pa_v`
//   }

//   let tokenbound;

//   if (provider) {
//     tokenbound = new TokenboundClient(options)
//   }

//   console.log(tokenbound)

//   const deployAccount = async () => {
//     try {
//       await tokenbound.createAccount({
//         tokenContract: formData.tokenContract,
//         tokenId: formData.tokenId,
//         salt: "3000000000"
//       })
//     }
//     catch (error) {
//       console.log(error)
//     }
//   }

//   const getAccount = async () => {
//     const account = await tokenbound.getAccount({
//       tokenContract: formData.tokenContract,
//       tokenId: formData.tokenId,
//       salt: "3000000000"
//     })

//     console.log(account)
//   }

//   const getStatus = async () => {
//     const status = await tokenbound.checkAccountDeployment({
//       tokenContract: formData.tokenContract,
//       tokenId: formData.tokenId,
//       salt: "3000000000"
//     })

//     console.log(status)
//   }

//   const transferERC20 = async () => {
//     await tokenbound.transferERC20({
//       tbaAddress: `0x3d7a3c23531850b928f7f565c7c19ef2cfa0fdc43bc79611e041a15a7902d3c`,
//       contractAddress: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`,
//       recipient: `0x002ce4e4ead169b7d815042e74e721371ae3c0a41fd55189ce20800db74921f2`,
//       amount: "100000000000000000"
//     })
//   }

//   const call1 = {
//     to: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`, //contractAddress to call
//     selector: `name`, // method to be called on the contract
//     calldata: [] // payload to be passed alongside the selector
//   }

//   const callAnotherSmartContract = async () => {
//     try {
//       const resp = await tokenbound.execute("0x3d7a3c23531850b928f7f565c7c19ef2cfa0fdc43bc79611e041a15a7902d3c", [call1])

//       console.log('successful', resp)
//     }
//     catch (error) {
//       console.log(error)
//     }

//   }

//   return (
    
//     <div>
//       <div className='flex justify-between'>
//         <h4 className="text-3xl font-bold underline">Crowd-Pass</h4>
//         <div className='flex flex-col'>
//           {!connection ? <button onClick={connectWallet}>connect</button> : <button onClick={disconnectWallet}>disconnect</button>}

//           {address && <h4>{address}</h4>}
//         </div>
//       </div>

//       <div className='grid grid-cols-4 gap-5 p-5'>
//         <div className='flex flex-col p-5 border border-slate-700 gap-y-2'>
//           <input
//             type="text"
//             placeholder='contract Address'
//             className='placeholder-slate-300'
//             name='tokenContract'
//             value={formData.tokenContract}
//             onChange={inputChange}
//           />
//           <input
//             type="text"
//             name="tokenId"
//             id=""
//             value={formData.tokenId}
//             onChange={inputChange}
//             placeholder='token Id'
//             className='placeholder-slate-300'
//           />
//           <button type="button" className='p-2 border border-slate-700 bg-yellow-200' onClick={getAccount}>getAccount</button>
//         </div>

//         <div className='flex flex-col p-5 border border-slate-700 gap-y-2'>
//           <input
//             type="text"
//             name='tokenContract'
//             value={formData.tokenContract}
//             onChange={inputChange}
//             id=""
//             placeholder='contract Address'
//             className='placeholder-slate-300'
//           />
//           <input
//             type="text"
//             name="tokenId"
//             id=""
//             value={formData.tokenId}
//             onChange={inputChange}
//             placeholder='token Id'
//             className='placeholder-slate-300'
//           />
//           <button type="button" className='p-2 border border-slate-700 bg-lime-200' onClick={getStatus}>getStatus</button>
//         </div>
//         <div className='flex flex-col p-5 border border-slate-700 gap-y-2'>
//           <input
//             type="text"
//             name='tokenContract'
//             value={formData.tokenContract}
//             onChange={inputChange}
//             id=""
//             placeholder='contract Address'
//             className='placeholder-slate-300'
//           />
//           <input
//             type="text"
//             name="tokenId"
//             id=""
//             value={formData.tokenId}
//             onChange={inputChange}
//             placeholder='token Id'
//             className='placeholder-slate-300'
//           />
//           <button type="button" className='p-2 border border-slate-700 bg-green-200' onClick={deployAccount}>deploy Account</button>
//         </div>
//         <div className='flex flex-col p-5 border border-slate-700 gap-y-2'>
//           <input
//             type="text"
//             name=""
//             id=""
//             placeholder='erc20 contract Address'
//             className='placeholder-slate-300'
//           />
//           <input
//             type="text"
//             name=""
//             id=""
//             placeholder='tba Address'
//             className='placeholder-slate-300'
//           />
//           <input
//             type="text"
//             name=""
//             id=""
//             placeholder='recipient Address'
//             className='placeholder-slate-300'
//           />
//           <input
//             type="number"
//             name=""
//             id=""
//             placeholder='amount'
//             className='placeholder-slate-300'
//           />
//           <button type='button' className='p-2 border border-slate-700 bg-red-200' onClick={transferERC20}>Transfer tokens</button>
//         </div>
//         <div className='flex p-5 border border-slate-700 gap-y-2'>
//           <button type='button' onClick={callAnotherSmartContract}>Execute</button>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default Test
