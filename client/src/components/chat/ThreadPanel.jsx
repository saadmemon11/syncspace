import { useEffect,useState } from "react"
import API from "../../services/api"

export default function ThreadPanel({messageId}){

const [replies,setReplies] = useState([])

useEffect(()=>{

API.get(`/messages/thread/${messageId}`)
.then(res=>setReplies(res.data))

},[messageId])

return(

<div className="w-80 bg-gray-900 p-4 border-l border-gray-700">

<h2 className="font-semibold mb-3">
Thread
</h2>

{replies.map(r=>(

<div key={r._id} className="mb-2">

<span className="text-sm font-semibold">
{r.user.name}
</span>

<p className="text-sm">{r.text}</p>

</div>

))}

</div>

)

}