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

export function RescheduleDialog({ id }) {

    const { eventContract } = useContext(KitContext)

    const [formData, setFormData] = useState({
        startTime: '',
        endTime: '',
    })

    const inputChange = (e) => {
        setFormData((prevState) => ({
            ...prevState, [e.target.name]: e.target.value
        }))
    }

    const rescheduleEvent = async (e) => {
        e.preventDefault()
        const toast1 = toast.loading('rescheduling Events')
        const _start_date = new Date(formData.startTime).getTime() / 1000;
        const _end_date = new Date(formData.endTime).getTime() / 1000;

        try {

            await eventContract.reschedule_event(id, _start_date, _end_date)
            toast.remove(toast1);
            toast.success("Event rescheduled")
        } catch (error) {
            toast.remove(toast1);
            toast.error(error.message)
        }
    }


    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"outline"} size="lg" className="w-full max-w-md  border border-deep-blue text-deep-blue hover:bg-deep-blue hover:text-primary">
                    Reschedule Event
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-base-white">
                <DialogHeader>
                    <DialogTitle>Reschedule Event</DialogTitle>
                    <DialogDescription>
                        change the start and end date of your event 
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col  gap-4">
                        <label htmlFor="name" >
                            Start Date
                        </label>
                        <input
                        type="date"
                            id="startTime"
                            name="startTime"
                            className="col-span-3 w-full"
                            value={formData.startTime}
                            onChange={inputChange}
                        />
                    </div>
                    <div className="flex flex-col  gap-4">
                        <label htmlFor="username" >
                            End Date 
                        </label>
                        <input
                            type="date"
                            id="endTime"
                            name="endTime"
                            value={formData.endTime}
                            className="col-span-3 w-full"
                            onChange={inputChange}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={rescheduleEvent} type="submit">Reschedule Event</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
