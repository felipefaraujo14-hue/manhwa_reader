import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from "react";

import {
  User,
  Session
} from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";


interface AuthContextType {

  user: User | null;

  session: Session | null;

  loading: boolean;

  isAdmin: boolean;

  profile: {
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;

}



const AuthContext = createContext<AuthContextType>({

  user: null,

  session: null,

  loading: true,

  isAdmin: false,

  profile: null,

  signOut: async () => {},

  refreshProfile: async () => {},

});



export const useAuth = () => useContext(AuthContext);





export function AuthProvider({
  children
}: {
  children: ReactNode
}) {


  const [user, setUser] =
    useState<User | null>(null);


  const [session, setSession] =
    useState<Session | null>(null);


  const [loading, setLoading] =
    useState(true);


  const [isAdmin, setIsAdmin] =
    useState(false);


  const [profile, setProfile] =
    useState<AuthContextType["profile"]>(null);





  // Busca dados do perfil

  const fetchProfile = async (
    userId: string
  ) => {


    const {
      data,
      error
    } = await supabase
      .from("profiles")
      .select(
        "display_name, avatar_url, bio"
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();



    if(error){

      console.error(
        "Erro buscando perfil:",
        error
      );

      return;

    }



    console.log(
      "Perfil carregado:",
      data
    );


    setProfile(data);


  };







  // Verifica se é admin

  const checkAdmin = async (
    userId:string
  ) => {


    const {
      data,
      error
    } = await supabase.rpc(
      "has_role",
      {
        _user_id:userId,
        _role:"admin"
      }
    );



    if(error){

      console.error(
        "Erro verificando admin:",
        error
      );

      setIsAdmin(false);

      return;

    }



    setIsAdmin(
      Boolean(data)
    );


  };







  // Atualiza perfil depois de salvar foto/nome

  const refreshProfile = async()=>{


    const {
      data
    } =
    await supabase.auth.getUser();



    if(data.user){

      await fetchProfile(
        data.user.id
      );

    }


  };







  useEffect(()=>{


    const {
      data:{
        subscription
      }
    } =
    supabase.auth.onAuthStateChange(
      (
        _event,
        session
      )=>{


        setSession(session);


        setUser(
          session?.user ?? null
        );



        if(session?.user){


          setTimeout(()=>{


            fetchProfile(
              session.user.id
            );


            checkAdmin(
              session.user.id
            );


          },0);



        }else{


          setProfile(null);

          setIsAdmin(false);


        }



        setLoading(false);


      }
    );







    supabase.auth
      .getSession()
      .then(
        ({
          data:{
            session
          }
        })=>{


          setSession(session);


          setUser(
            session?.user ?? null
          );



          if(session?.user){


            fetchProfile(
              session.user.id
            );


            checkAdmin(
              session.user.id
            );


          }



          setLoading(false);


        }
      );







    return ()=>{

      subscription.unsubscribe();

    };


  },[]);







  const signOut = async()=>{

    await supabase.auth.signOut();

  };







  return (

    <AuthContext.Provider

      value={{

        user,

        session,

        loading,

        isAdmin,

        profile,

        signOut,

        refreshProfile

      }}

    >

      {children}

    </AuthContext.Provider>

  );


}