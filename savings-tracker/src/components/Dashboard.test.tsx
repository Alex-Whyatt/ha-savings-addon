import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'
import { SavingsData, SavingsProjection, User } from '../types'

// Mock the child components
vi.mock('./SavingsPotCard', () => ({
  default: ({ pot }: { pot: any }) => <div data-testid={`pot-${pot.id}`}>{pot.name}</div>
}))

vi.mock('./ProjectionChart', () => ({
  default: ({ projections }: { projections: any[] }) => (
    <div data-testid="projection-chart">Chart with {projections.length} projections</div>
  )
}))

describe('Dashboard', () => {
  const mockUser: User = {
    id: 'alex',
    name: 'Alex'
  }

  const mockOtherUser: User = {
    id: 'beth',
    name: 'Beth'
  }

  const mockPots = [
    {
      id: 'pot1',
      userId: 'alex',
      name: 'Alex\'s Emergency Fund',
      description: 'For emergencies',
      currentTotal: 500,
      targetAmount: 1000,
      color: '#667eea',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'pot2',
      userId: 'alex',
      name: 'Alex\'s Vacation Fund',
      description: 'For vacation',
      currentTotal: 200,
      targetAmount: 500,
      color: '#764ba2',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'pot3',
      userId: 'beth',
      name: 'Beth\'s Car Fund',
      description: 'For new car',
      currentTotal: 800,
      targetAmount: 2000,
      color: '#f093fb',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'pot4',
      userId: 'beth',
      name: 'Beth\'s House Fund',
      description: 'For house down payment',
      currentTotal: 300,
      targetAmount: 10000,
      color: '#f5576c',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  const mockTransactions = [
    {
      id: 'trans1',
      userId: 'alex',
      potId: 'pot1',
      amount: 100,
      date: new Date(),
      description: 'Monthly savings',
      repeatMonthly: true,
      createdAt: new Date()
    },
    {
      id: 'trans2',
      userId: 'beth',
      potId: 'pot3',
      amount: 150,
      date: new Date(),
      description: 'Car payment',
      repeatMonthly: false,
      createdAt: new Date()
    }
  ]

  const mockData: SavingsData = {
    pots: mockPots,
    transactions: mockTransactions
  }

  const mockProjections: SavingsProjection[] = [
    {
      potId: 'pot1',
      data: [
        { date: new Date(), amount: 500, projected: false },
        { date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), amount: 600, projected: true }
      ]
    }
  ]

  const mockOnDataChange = vi.fn()

  it('should display both users\' pots when Alex is logged in', () => {
    render(
      <Dashboard
        data={mockData}
        projections={mockProjections}
        onDataChange={mockOnDataChange}
        currentUser={mockUser}
      />
    )

    // Check that Alex's pots are displayed
    expect(screen.getByTestId('pot-pot1')).toBeInTheDocument()
    expect(screen.getByTestId('pot-pot2')).toBeInTheDocument()

    // Check that Beth's pots are displayed
    expect(screen.getByTestId('pot-pot3')).toBeInTheDocument()
    expect(screen.getByTestId('pot-pot4')).toBeInTheDocument()

    // Check section headers
    expect(screen.getByText("Your Savings Pots")).toBeInTheDocument()
    expect(screen.getByText("Beth's Savings Pots")).toBeInTheDocument()
  })

  it('should display both users\' pots when Beth is logged in', () => {
    render(
      <Dashboard
        data={mockData}
        projections={mockProjections}
        onDataChange={mockOnDataChange}
        currentUser={mockOtherUser}
      />
    )

    // Check that Beth's pots are displayed
    expect(screen.getByTestId('pot-pot3')).toBeInTheDocument()
    expect(screen.getByTestId('pot-pot4')).toBeInTheDocument()

    // Check that Alex's pots are displayed
    expect(screen.getByTestId('pot-pot1')).toBeInTheDocument()
    expect(screen.getByTestId('pot-pot2')).toBeInTheDocument()

    // Check section headers
    expect(screen.getByText("Your Savings Pots")).toBeInTheDocument()
    expect(screen.getByText("Alex's Savings Pots")).toBeInTheDocument()
  })

  it('should show correct total savings and active pots count', () => {
    render(
      <Dashboard
        data={mockData}
        projections={mockProjections}
        onDataChange={mockOnDataChange}
        currentUser={mockUser}
      />
    )

    // Total savings should be sum of all pots: 500 + 200 + 800 + 300 = 1800
    expect(screen.getByText('£1800.00')).toBeInTheDocument()

    // Active pots should be 4
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('should show projections chart when projections are available', () => {
    render(
      <Dashboard
        data={mockData}
        projections={mockProjections}
        onDataChange={mockOnDataChange}
        currentUser={mockUser}
      />
    )

    expect(screen.getByTestId('projection-chart')).toBeInTheDocument()
    expect(screen.getByText('Savings Projections')).toBeInTheDocument()
  })

  it('should not show projections chart when no projections are available', () => {
    render(
      <Dashboard
        data={mockData}
        projections={[]}
        onDataChange={mockOnDataChange}
        currentUser={mockUser}
      />
    )

    expect(screen.queryByTestId('projection-chart')).not.toBeInTheDocument()
    expect(screen.queryByText('Savings Projections')).not.toBeInTheDocument()
  })

  it('should show empty state when user has no pots', () => {
    const emptyData: SavingsData = {
      pots: mockPots.filter(pot => pot.userId === 'beth'), // Only Beth's pots
      transactions: mockTransactions.filter(t => t.userId === 'beth')
    }

    render(
      <Dashboard
        data={emptyData}
        projections={[]}
        onDataChange={mockOnDataChange}
        currentUser={mockUser}
      />
    )

    // Should show Beth's pots
    expect(screen.getByTestId('pot-pot3')).toBeInTheDocument()
    expect(screen.getByTestId('pot-pot4')).toBeInTheDocument()

    // Should show empty state for Alex's pots
    expect(screen.getByText("No savings pots yet. Create your first pot to get started!")).toBeInTheDocument()
  })
})