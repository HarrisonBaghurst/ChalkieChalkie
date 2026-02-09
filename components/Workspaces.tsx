import { useEffect, useState } from 'react';
import WorkspaceCard from './WorkspaceCard'

const Workspaces = () => {

    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/get/user-boards`, {
                    cache: 'no-store'
                });

                if (!res.ok) {
                    console.error('Failed to fetch workspaces');
                }

                const data = await res.json();
                setWorkspaces(data);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        }

        fetchWorkspaces();
    }, [])


    return (
        <div className='px-[10%] py-20 flex flex-col gap-10 bg-white/1.5 border-t border-t-[#ffffff]/15'>
            <h2 className='font-mont-bold text-2xl'>
                Your workspaces
            </h2>
            <div className='grid grid-cols-4 gap-6'>
                {workspaces.map((workspace, index) => (
                    <WorkspaceCard
                        key={index}
                        title='Untitled workspace'
                        uuid={workspace.id}
                        host={workspace.host_id}
                        collaborators={workspace.user_ids}
                        lastEdited={new Date(workspace.last_activity_at)}
                        loading={loading}
                    />
                ))}
            </div>
        </div>
    )
}

export default Workspaces