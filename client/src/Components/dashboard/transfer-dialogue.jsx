import { useContext, useState } from "react"
import { Button } from "../shared/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../shared/dialog"
import { KitContext } from "../../context/kit-context"
import toast from "react-hot-toast"
import { TokenboundClient } from 'starknet-tokenbound-sdk';
import { cairo } from "starknet"


export function TransferDialog({ tba }) {

    const { account } = useContext(KitContext)

    const [formData, setFormData] = useState({
        receiver: '',
        amount: '',
    })

    const options = {
            account: account,
            registryAddress: `0x4101d3fa033024654083dd982273a300cb019b8cb96dd829267a4daf59f7b7e`,
            implementationAddress: `0x45d67b8590561c9b54e14dd309c9f38c4e2c554dd59414021f9d079811621bd`,
            jsonRPC: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/RCp5m7oq9i9myxsvC8ctUmNq2Wq2Pa_v`
          }
        
          let tokenbound;
        
          if (account) {
            tokenbound = new TokenboundClient(options)
          }

    const inputChange = (e) => {
        setFormData((prevState) => ({
            ...prevState, [e.target.name]: e.target.value
        }))
    }

    const transferERC20 = async () => {
        const toast1 = toast.loading('Transferring token')
        await tokenbound.transferERC20({
            tbaAddress: tba,
            contractAddress: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`,
            recipient: formData.receiver,
            amount: Number(formData.amount) * 1e18
        })
        toast.remove(toast1);
        toast.success("Transfer successful")
    }


    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"outline"} size="sm" className=" max-w-md  border border-deep-blue text-deep-blue hover:bg-deep-blue hover:text-primary">
                    Transfer
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-base-white">
                <DialogHeader>
                    <DialogTitle>Transfer</DialogTitle>
                    <DialogDescription>
                        send your tokens
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col  gap-4">
                        <label htmlFor="name" >
                            Receiver address                        </label>
                        <input
                            type="text"
                            id="receiver"
                            name="receiver"
                            className="col-span-3 w-full"
                            value={formData.receiver}
                            onChange={inputChange}
                        />
                    </div>
                    <div className="flex flex-col  gap-4">
                        <label htmlFor="username" >
                            Amount
                        </label>
                        <input
                            type="text"
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            className="col-span-3 w-full"
                            onChange={inputChange}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={transferERC20} type="submit">Transfer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
