import { useContext, useEffect, useRef, useState } from "react";
import { FlatList, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import Avatar from "../../../components/ui/Avatar";
import Spinner from "../../../components/ui/Spinner";
import ActionMenu, { type ActionMenuItem } from "../../../components/ui/ActionMenu";
import { useMessages } from "../../../hooks/useMessages";
import { apiFetch } from "../../../lib/api";
import { playMessageSentSound } from "../../../lib/sound";
import { EchoContext } from "../../../contexts/EchoContext";
import useAuthStore from "../../../store/useAuthStore";
import type { DisplayMessage, MessagesPage, UserPublic } from "../../../types/models";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { peerId: rawPeerId } = useLocalSearchParams<{ peerId?: string | string[] }>();
  const peerIdValue = Array.isArray(rawPeerId) ? rawPeerId[0] : rawPeerId;
  const parsedPeerId = Number(peerIdValue);
  const peerId = Number.isInteger(parsedPeerId) && parsedPeerId > 0 ? parsedPeerId : null;
  const me = useAuthStore((s) => s.user);
  const echo = useContext(EchoContext);
  const qc = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const [peer,setPeer]=useState<UserPublic|null>(null); const [input,setInput]=useState(""); const [emojiOpen,setEmojiOpen]=useState(false); const [menuMessage,setMenuMessage]=useState<DisplayMessage|null>(null); const [editing,setEditing]=useState<DisplayMessage|null>(null); const [editText,setEditText]=useState("");
  useEffect(()=>{if(!me) router.replace("/(auth)/login")},[me]);
  const query=useMessages(peerId,Boolean(me));
  useEffect(()=>{if(!peerId)return;apiFetch<UserPublic>(`/api/users/${peerId}`,{auth:false}).then(setPeer).catch(()=>{})},[peerId]);
  useEffect(()=>{if(!echo||!peerId)return; const channel=echo.channel(`conversations.${peerId}`); const prepend=(message:DisplayMessage)=>qc.setQueryData<InfiniteData<MessagesPage>>(["messages",peerId],old=>old?{...old,pages:[{...old.pages[0],data:[...old.pages[0].data,message]},...old.pages.slice(1)]}:old); const update=(message:DisplayMessage)=>qc.setQueryData<InfiniteData<MessagesPage>>(["messages",peerId],old=>old?{...old,pages:old.pages.map(page=>({...page,data:page.data.map(item=>item.id===message.id?{...item,...message}:item)}))}:old); channel.listen(".NewMessage",({message}:{message:DisplayMessage})=>prepend(message)); channel.listen(".MessageUpdated",({message}:{message:DisplayMessage})=>update(message)); return()=>{channel.stopListening(".NewMessage");channel.stopListening(".MessageUpdated")}},[echo,peerId,qc]);
  const sendMutation=useMutation({mutationFn:(body:string)=>apiFetch<DisplayMessage>(`/api/conversations/${peerId}`,{method:"POST",body:{body}}),onMutate:async(body)=>{await qc.cancelQueries({queryKey:["messages",peerId]});const prev=qc.getQueryData<InfiniteData<MessagesPage>>(["messages",peerId]);qc.setQueryData<InfiniteData<MessagesPage>>(["messages",peerId],old=>old?{...old,pages:[{...old.pages[0],data:[...old.pages[0].data,{id:-Date.now(),body,from_user_id:me?.id??-1,to_user_id:peerId??-1,read_at:null,sending:true,created_at:new Date().toISOString()}]},...old.pages.slice(1)]}:old);return{prev}},onError:(_e,_b,c)=>{if(c?.prev)qc.setQueryData(["messages",peerId],c.prev)},onSuccess:()=>void playMessageSentSound(),onSettled:()=>qc.invalidateQueries({queryKey:["messages",peerId]})});
  const editMutation=useMutation({mutationFn:({id,body}:{id:number;body:string})=>apiFetch<DisplayMessage>(`/api/messages/${id}`,{method:"PATCH",body:{body}}),onSettled:()=>qc.invalidateQueries({queryKey:["messages",peerId]})});
  const deleteMutation=useMutation({mutationFn:(id:number)=>apiFetch<DisplayMessage>(`/api/messages/${id}`,{method:"DELETE"}),onSettled:()=>qc.invalidateQueries({queryKey:["messages",peerId]})});
  const flat=(query.data?.pages??[]).flatMap(p=>p.data);
  useEffect(()=>{if(flat.length)setTimeout(()=>listRef.current?.scrollToEnd({animated:true}),50)},[flat.length]);
  const send=()=>{const body=input.trim();if(!body||!peerId)return;setInput("");sendMutation.mutate(body)};
  const menuItems:ActionMenuItem[]=menuMessage?[{label:"Copy",icon:"copy" as const,onPress:()=>void Clipboard.setStringAsync(menuMessage.body)},...(menuMessage.from_user_id===me?.id&&!menuMessage.sending&&!menuMessage.deleted_at?[{label:"Edit",icon:"edit-2" as const,onPress:()=>{setEditText(menuMessage.body);setEditing(menuMessage);setMenuMessage(null)}},{label:"Recall for everyone",icon:"rotate-ccw" as const,destructive:true,onPress:()=>deleteMutation.mutate(menuMessage.id)}]:[])]:[];
  const content = <View className="flex-1 bg-background" style={{paddingTop:insets.top}}>
    <View className="flex-row items-center border-b border-border-hairline px-4 py-3"><Pressable onPress={()=>router.back()} className="mr-3 p-1"><Feather name="chevron-left" size={22} color="#8b91a0"/></Pressable>{peer?<View className="flex-row items-center gap-3"><Avatar uri={peer.avatar_url} size="sm"/><Text className="font-sans-semibold text-foreground">{peer.name}</Text></View>:<Spinner size={18}/>}</View>
    {query.isLoading?<Spinner className="flex-1"/>:<FlatList ref={listRef} style={{flex:1}} data={flat} keyExtractor={i=>String(i.id)} contentContainerClassName="gap-2 px-4 py-4" keyboardShouldPersistTaps="handled" renderItem={({item})=>{const isMe=item.from_user_id===me?.id;return <View className={`flex-row items-end gap-1 ${isMe?"justify-end":"justify-start"}`}><Pressable onLongPress={()=>setMenuMessage(item)} delayLongPress={350} className="max-w-[82%]"><View className={`rounded-2xl px-4 py-2 ${isMe?"rounded-br-md bg-foreground":"rounded-bl-md border border-border-hairline bg-surface"} ${item.sending?"opacity-70":""}`}><Text className={`font-sans text-[15px] ${isMe?"text-background":"text-foreground"}`}>{item.body}</Text><Text className={`mt-1 font-mono text-[11px] ${isMe?"text-background/60":"text-foreground-subtle"}`}>{new Date(item.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}{item.sending?" · Sending…":item.edited_at?" · edited":""}</Text></View></Pressable><Pressable onPress={()=>setMenuMessage(item)} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full" accessibilityRole="button" accessibilityLabel="Message actions"><Feather name="more-horizontal" size={18} color="#8b91a0"/></Pressable></View>}}/>}
    {emojiOpen&&<View className="flex-row flex-wrap gap-1 border-t border-border-hairline bg-surface px-3 py-2">{["👍","✓","🙏","💡","👏","🙂","❤️","🔎","🎯","⚠️"].map(e=><Pressable key={e} onPress={()=>setInput(v=>v+e)} className="h-9 w-9 items-center justify-center rounded-control bg-surface-sunken"><Text className="text-lg">{e}</Text></Pressable>)}</View>}
    <View className="flex-row items-end gap-2 border-t border-border-hairline px-3 py-2.5" style={{paddingBottom:insets.bottom+10}}><Pressable onPress={()=>setEmojiOpen(v=>!v)} className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken"><Feather name="smile" size={17} color="#666c7a"/></Pressable><TextInput value={input} onChangeText={setInput} placeholder="Write with intent…" placeholderTextColor="#8b91a0" multiline className="max-h-28 flex-1 rounded-control border border-border-hairline bg-surface-sunken px-3.5 py-2.5 font-sans text-sm text-foreground"/><Pressable onPress={send} disabled={sendMutation.isPending||!input.trim()} className={`h-10 w-10 items-center justify-center rounded-full ${input.trim()?"bg-accent":"bg-surface-sunken"}`}><Feather name="send" size={17} color={input.trim()?"#201203":"#8b91a0"}/></Pressable></View>
    <ActionMenu visible={Boolean(menuMessage)} onClose={()=>setMenuMessage(null)} items={menuItems} title="Message actions"/>
    <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={()=>setEditing(null)}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full rounded-2xl border border-border-hairline bg-surface p-5">
          <Text className="font-sans-semibold text-lg text-foreground">Edit message</Text>
          <Text className="mt-1 font-sans text-sm text-foreground-subtle">Keep the meaning clear. You have 15 minutes to edit.</Text>
          <TextInput value={editText} onChangeText={setEditText} multiline autoFocus className="mt-4 min-h-24 rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-sm text-foreground" placeholder="Edit your message" placeholderTextColor="#8b91a0"/>
          <View className="mt-4 flex-row justify-end gap-2">
            <Pressable onPress={()=>setEditing(null)} className="rounded-control px-4 py-2.5"><Text className="font-sans-medium text-sm text-foreground-muted">Cancel</Text></Pressable>
            <Pressable disabled={!editText.trim()||editMutation.isPending} onPress={()=>{if(editing)editMutation.mutate({id:editing.id,body:editText.trim()},{onSuccess:()=>setEditing(null)})}} className="rounded-control bg-accent px-4 py-2.5"><Text className="font-sans-semibold text-sm text-background">Save</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;

  if (!peerId) {
    return <View className="flex-1 items-center justify-center bg-background"><Text className="font-sans text-foreground-muted">Conversation unavailable.</Text></View>;
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior="padding"
      automaticOffset
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
