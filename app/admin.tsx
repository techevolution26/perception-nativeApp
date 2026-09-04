import { useEffect,useState } from "react";
import { Alert,Pressable,ScrollView,Text,TextInput,View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import useAuthStore from "../store/useAuthStore";
import { apiFetch } from "../lib/api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

interface AdminOverview { users:number; perceptions:number; likes:number; comments:number; messages:number; active_users:number; }
export default function AdminScreen(){
 const user=useAuthStore(s=>s.user); const [password,setPassword]=useState(""); const [unlocked,setUnlocked]=useState(false); const [loading,setLoading]=useState(false); const [stats,setStats]=useState<AdminOverview|null>(null);
 useEffect(()=>{if(user?.role!=="SUPER_ADMIN")router.replace("/(tabs)")},[user]);
 const unlock=async()=>{if(!user||!password)return;setLoading(true);try{const res=await apiFetch<{token:string}>("/api/admin/session",{method:"POST",auth:true,body:{email:user.email,password}}); await apiFetch<AdminOverview>("/api/admin/overview",{auth:false,headers:{Authorization:`Bearer ${res.token}`}}).then(setStats);setUnlocked(true);setPassword("")}catch(e){Alert.alert("Access denied",e instanceof Error?e.message:"Admin authorization failed.")}finally{setLoading(false)}};
 if(!user||user.role!=="SUPER_ADMIN")return null;
 return <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-12 pt-14"><Pressable onPress={()=>router.back()} className="mb-8 flex-row items-center gap-2"><Feather name="chevron-left" size={20} color="#8b91a0"/><Text className="font-sans text-foreground-muted">Back</Text></Pressable><Text className="font-sans-semibold text-2xl text-foreground">Control room</Text><Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">A separate, short-lived admin session protects platform controls from ordinary account sessions.</Text>{!unlocked?<View className="mt-8 gap-3 rounded-card border border-border-hairline bg-surface p-4"><Text className="font-sans-medium text-foreground">Unlock with your account password</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#8b91a0" className="rounded-control border border-border-hairline bg-surface-sunken px-3.5 py-3 font-sans text-foreground"/><Button label="Unlock control room" loading={loading} disabled={!password} variant="accent" onPress={unlock}/></View>:stats?<View className="mt-8 flex-row flex-wrap gap-3">{Object.entries(stats).map(([key,value])=><View key={key} className="w-[47%] rounded-card border border-border-hairline bg-surface p-4"><Text className="font-mono text-2xl text-foreground">{value}</Text><Text className="mt-1 font-sans text-xs uppercase tracking-wider text-foreground-subtle">{key.replace("_"," ")}</Text></View>)}</View>:<Spinner/>}</ScrollView>
}
