import { useState } from "react"
import API from "../../services/api"

const emojis=["👍","🔥","😂","🎉","❤️"]

export default function EmojiPicker({messageId}){

const [open,setOpen] = useState(false)

const react = async(emoji)=>{

await API.post("/messages/react",{
messageId,
emoji
})

setOpen(false)

}

return(

<div className="relative">

<button onClick={()=>setOpen(!open)}>
😊
</button>

{open && (

<div className="absolute bg-gray-800 p-2 rounded flex gap-2">

{emojis.map(e=>(

<button
key={e}
onClick={()=>react(e)}>

{e}

</button>

))}

</div>

)}

</div>

)

}