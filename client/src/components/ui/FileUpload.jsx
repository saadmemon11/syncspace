import API from "../../services/api"

export default function FileUpload({channelId}){

const upload = async(e)=>{

const file = e.target.files[0]

const form = new FormData()

form.append("file",file)
form.append("channelId",channelId)

await API.post("/messages/file",form)

}

return(

<label className="cursor-pointer">

📎

<input
type="file"
hidden
onChange={upload}
/>

</label>

)

}