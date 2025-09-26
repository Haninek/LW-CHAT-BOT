import { useAppStore } from '../state/useAppStore'
import AiChat from '../components/chat/AiChat'

export default function Chat() {
  const { currentMerchant } = useAppStore()
  
  // Try to get merchant and deal info from current context
  const merchantId = currentMerchant?.id
  const dealId = currentMerchant?.currentDealId // Assuming this exists

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <AiChat 
          merchantId={merchantId} 
          dealId={dealId}
        />
      </div>
    </div>
  )
}