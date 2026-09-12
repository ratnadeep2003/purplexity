import { createClient } from "@supabase/supabase-js"
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!)
export default function Auth(){
    async function login(provider: "github" | "google"){
        const {data, error} = await supabase.auth.signInWithOAuth({
            provider: provider
        })
        if(error){
            alert("Error while signing in")
        }else{
            alert("SignedIn")
        }
    }
    return(
        <div>
            <button onClick={()=> login("google")}>Login with Google</button>
            <button onClick={()=> login("github")}>Login with Github</button>
        </div>
    )
}