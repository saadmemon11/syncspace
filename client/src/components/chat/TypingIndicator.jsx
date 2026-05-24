import { useContext,useEffect,useState } from "react"
import { SocketContext } from "../../context/SocketContext"

export default function TypingIndicator({channelId}){

const socket = useContext(SocketContext)

const [typingUser,setTypingUser] = useState(null)

useEffect(()=>{

socket.on("typing",(user)=>{
setTypingUser(user)
})

socket.on("stopTyping",()=>{
setTypingUser(null)
})

},[])

if(!typingUser) return null

return(

<div className="text-sm text-gray-400 px-4 pb-2">

{typingUser} is typing...

</div>

)

}