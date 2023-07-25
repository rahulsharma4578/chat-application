import {useEffect, useState,useContext,useRef} from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import {uniqBy} from "lodash";
import {UserContext} from "./UserContext.jsx";
import axios from "axios";
import Contact from "./Contact";


export default function Chat() {
  const [ws,setWs] = useState(null);
  const [onlinePeople,setOnlinePeople] = useState({});
  const [offlinePeople,setOfflinePeople]= useState({});
  const [selectedUserId,setSelectedUserId] = useState(null);
  const [newMessageText,setNewMessageText] = useState('');
  const [messages,setMessages] = useState([]);
  const {username, id,setId,setUsername} = useContext(UserContext);
  const divUnderMessages = useRef();
  useEffect(() => {
    connectToWs();


  }, []);
  function connectToWs() {
    const ws = new WebSocket('ws://localhost:4000');
    setWs(ws);
    ws.addEventListener('message', handleMessage);
    //this connectTows function is to cinnect to web socket on its own when refresh is done.
    //Without this when the server starts all the users vanishes.
    //over here i have applied a timeout of some second to reconnect to ws.
    ws.addEventListener('close', () => {
      setTimeout(() => {
        console.log('Disconnected. Trying to reconnect.');
        connectToWs();
      }, 1000);
    });

  }
  //below we are displaying the unique users.
  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({userId,username}) => {
      people[userId] = username;

    });
    setOnlinePeople(people);
  }
  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    console.log({ev,messageData});
    if('online' in messageData) {
      showOnlinePeople(messageData.online);
    } else if ('text' in messageData) {
      //the below code if to show the messages in the section of person who send them
      if(messageData.sender === selectedUSerId )
      {
          setMessages(prev => ([...prev, {...messageData}]));

      }

    }

  }
  function logout() {
    axios.post('/logout').then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });

  }
  function sendMessage(ev, file = null) {

    if (ev) ev.preventDefault();


    ws.send(JSON.stringify({
      recipient: selectedUserId,
      text: newMessageText,
      file,

    }));


    if (file) {
      axios.get('/messages/' +selectedUserId).then(res => {
        setMessages(res.data);
      });

    }else {
      setNewMessageText('');
      //the below date.now will actually assign id so that all the messages we send get displayed on our screen
      setMessages(prev => ([...prev,{text: newMessageText, sender: id, recipient: selectedUserId,_id:Date.now(),}]));

    }



  }
  function sendFile(ev) {
    const reader = new FileReader();
    //below will return the file in base64 which is easy to read
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }
  //the below function will run when the messages changes
  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({behavior:'smooth', block:'end'});
    }

  }, [messages]);
  //now we want to display the offline people also so below useEffect function will
  // filter out the online people through this.

  //Also we can see that below in this function we are filtering out offline people that is
  //the current user cant be in offline user and the logged in user cant be in offline people.

  useEffect(() => {
    axios.get('/people').then(res => {

      const offlinePeopleArr = res.data
       .filter(p => p._id !== id)
       .filter(p => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach(p => {
        offlinePeople[p._id] = p;
      });
      //console.log({offlinePeople,offlinePeopleArr});
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);
  //The below useeffect will rum when the selecteduserId changes
  useEffect(() => {
    if(selectedUserId) {
      axios.get('/messages/' +selectedUserId).then(res => {
        setMessages(res.data);
      });
    }

  }, [selectedUserId]);

  const onlinePeopleExclOurUser = {...onlinePeople};
  delete onlinePeopleExclOurUser[id];

  // The below uniqby function from lodash is used to get the unique messages.
  const messageWithoutDupes = uniqBy(messages, '_id');


  return (
  <div className="flex h-screen">
    <div className="bg-white w-1/3 flex flex-col">
      <div className="flex-grow">
        <Logo />

        {Object.keys(onlinePeopleExclOurUser).map(userId => (
          <Contact
            key={userId}
            id={userId}
            online={true}
            username={onlinePeopleExclOurUser[userId]}
            onClick={() => setSelectedUserId(userId)}
            selected={userId === selectedUserId}
          />
        ))}

        {Object.keys(offlinePeople).map(userId => (
          <Contact
            key={userId}
            id={userId}
            online={false}
            username={offlinePeople[userId].username}
            onClick={() => setSelectedUserId(userId)}
            selected={userId === selectedUserId}
          />
        ))}
      </div>

      <div className="p-2 text-center flex items-center justify-center">
       <span className="mr-2 text-sm text-gray-600 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        </svg>

        {username}
        </span>
       <button
        onClick={logout}
        className="text-sm bg-blue-100 py-1 px-2 text-gray-600 border rounded-sm">logout</button>

      </div>
    </div>

    <div className="flex flex-col bg-blue-100 w-2/3 mx-2 p-2">
      <div className="flex-grow">
        {!selectedUserId && (
          <div className="flex h-full items-center justify-center">
            <div className="text-gray-400">&larr; Select a person from sidebar</div>
          </div>
        )}

        {!!selectedUserId && (
          <div className="relative h-full">
            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
              {messageWithoutDupes.map(message => (
                <div key={message._id} className={message.sender === id ? 'text-right' : 'text-left'}>
                  <div
                    className={
                      'text-left inline-block p-2 my-2 rounded-md text-sm' +
                      (message.sender === id ? ' bg-blue-500 text-orange' : ' bg-white text-gray-500')
                    }
                  >
                    {message.text}
                    {message.file && (
                      <div className="">

                      <a target="_blank" className="flex items-center gap-1 border-b" href={axios.defaults.baseURL + '/uploads/' + message.file}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                      </svg>
                        {message.file}

                      </a>

                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={divUnderMessages}></div>
            </div>
          </div>
        )}
      </div>
    </div>

    {!!selectedUserId && (
      <form className="flex gap-2 " onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessageText}
          onChange={ev => setNewMessageText(ev.target.value)}
          placeholder="Type your message here"
          className="bg-white flex-grow border p-2 rounded-sm"
        />
       <label type="button" className="bg-blue-200 p-2 text-gray-600 cursor-pointer rounded-sm border border-blue-200">
        <input type="file" className="hidden" onChange={sendFile}/>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
        </svg>

       </label>
        <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </form>
    )}
  </div>
);
}
