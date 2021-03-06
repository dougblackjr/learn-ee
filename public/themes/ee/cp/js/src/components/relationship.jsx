/*!
 * This source file is part of the open source project
 * ExpressionEngine (https://expressionengine.com)
 *
 * @link      https://expressionengine.com/
 * @copyright Copyright (c) 2003-2020, Packet Tide, LLC (https://www.packettide.com)
 * @license   https://expressionengine.com/license Licensed under Apache License, Version 2.0
 */


class Relationship extends React.Component {

    constructor(props) {
        super(props)

        this.state = {
            selected: props.selected,
            items: props.items,
            channelFilter: false,
            filterTerm: false
        }
    }

    static renderFields(context) {
        $('div[data-relationship-react]', context).each(function () {
            let props = JSON.parse(window.atob($(this).data('relationshipReact')))
            props.name = $(this).data('inputValue')

            ReactDOM.render(React.createElement(Relationship, props, null), this)
        })
	}

	componentDidMount() {
		this.bindSortable()
	}

    componentDidUpdate(prevProps, prevState) {
        if (this.state.selected !== prevState.selected) {
            // Refresh the sortable items when the selected items change
            this.bindSortable()
        }
    }

    selectItem(item) {
        const index = this.state.selected.findIndex((obj) => obj.value === item.value);

        // Don't add duplicate items
        if (index !== -1) {
            return
        }

        // Add the item to the selection
        this.setState({ selected: [...this.state.selected, item] })

        // Because the add field button shifts down when an item is added, we need to tell
        // the dropdown controller to update the dropdown positions so the dropdown stays under the button
        DropdownController.updateDropdownPositions()
    }

    deselect(itemId) {
        this.setState({ selected: this.state.selected.filter(function(item) {
            return item.value !== itemId
        })});
    }

    // Opens a modal to create a new entry
    openPublishFormForChannel (channel) {
        const channelTitle = channel.title
        const channelId = channel.id

        EE.cp.ModalForm.openForm({
            url: EE.relationship.publishCreateUrl.replace('###', channelId),
            full: true,
            iframe: true,
            success: this.entryWasCreated,
            load: (modal) => {
                const entryTitle = this.field.closest('[data-publish]').find('input[name=title]').val()

                let title = EE.relationship.lang.creatingNew
                    .replace('#to_channel#', channelTitle)
                    .replace('#from_channel#', EE.publish.channel_title)

                if (entryTitle) {
                    title += '<b>: ' + entryTitle + '</b>'
                }

                EE.cp.ModalForm.setTitle(title)
            }
        })
    }

    // Event when a new entry was created by the channel modal
    entryWasCreated = (result, modal) => {
        let selected = this.state.selected

        if (this.props.multi) {
            selected.push(result.item)
        } else {
            selected = [result.item]
        }

        this.setState({ selected: selected, items: [...this.state.items, result.item] })

        modal.trigger('modal:close')
    }

    channelFilterChange = (newValue) => {
        this.setState({ channelFilter: newValue })
    }

    handleSearch = (event) => {
        this.setState({ filterTerm: event.target.value || false })
    }

	bindSortable = () => {
		let thisRef = this

		$(this.listGroup).sortable({
			axis: 'y',
			containment: 'parent',
			handle: '.list-item__handle',
			items: '.list-item',
			sort: EE.sortable_sort_helper,
			start: (event, ui) => {
				// Save the start index for later
				$(this).attr('data-start-index', ui.item.index());
			},
			stop: (event, ui) => {

				var newIndex = ui.item.index();
				var oldIndex = $(this).attr('data-start-index');

				// Cancel the sort so jQeury doesn't move the items
				// This needs to be done by react since it handles the dom
				$(thisRef.listGroup).sortable('cancel')

				let selected = thisRef.state.selected

				// Move the item to the new position
				selected.splice(newIndex, 0, selected.splice(oldIndex, 1)[0]);

				thisRef.setState({ selected: selected })
			}
		})
	}

    render() {
        let props = this.props

        // Determine what items show up in the add dropdown
        let dropdownItems = this.state.items.filter((el) => {
            let allowedChannel = true

            // Is the user filtering by channel?
            if (this.state.channelFilter) {
                allowedChannel = (el.channel_id == this.state.channelFilter)
            }

            let filterName = true

            // Is the user filtering by name
            if (this.state.filterTerm) {
                filterName = el.label.toLowerCase().includes(this.state.filterTerm.toLowerCase())
            }

            // Only show items that are not already added
            let notInSelected = (! this.state.selected.some(e => e.value === el.value))

            return notInSelected && allowedChannel && filterName
        })

        let showAddButton = ((this.props.limit > this.state.selected.length) && (this.props.multi || this.state.selected.length==0))

        let channelFilterItems = props.channels.map((channel) => {
            return { label: channel.title, value: channel.id}
        })

        return (
            <div ref={el => this.field = el}>
                {this.state.selected.length > 0 &&
                <ul className="list-group list-group--connected mb-s" ref={el => this.listGroup = el}>
                    {
                        this.state.selected.map((item) => {
                            return (
                                <li className="list-item">
									{this.state.selected.length > 1 &&
									<div class="list-item__handle"><i class="fas fa-bars"></i></div>
									}
                                    <div className="list-item__content">
                                        <div class="list-item__title">{item.label} {this.state.selected.length > 10 && <small className="meta-info ml-s float-right"> {item.instructions}</small>}</div>
                                        {this.state.selected.length <= 10 &&
                                        <div class="list-item__secondary">{item.instructions}</div>
                                        }
                                    </div>
                                    <div class="list-item__content-right">
                                        <div className="button-group">
                                            <button type="button" title={EE.relationship.lang.remove} onClick={() => this.deselect(item.value)} className="button button--small button--default"><i class="fas fa-fw fa-trash-alt"></i></button>
                                        </div>
                                    </div>
                                </li>
                            )
                        })
                    }
                </ul>
                }

                {/* Keep an empty input when no items are selected */}
                {this.state.selected.length == 0 &&
                    <input type="hidden" name={props.multi ? props.name + '[]' : props.name} value=""/>
                }

                {this.state.selected.map((item) => {
                        return (<input type="hidden" name={props.multi ? props.name + '[]' : props.name} value={item.value}/>)
                    })
                }

                <div style={{display: showAddButton ? 'block' : 'none' }}>
				<button type="button" className="js-dropdown-toggle button button--default"><i class="fas fa-plus icon-left"></i> {EE.relationship.lang.relateEntry}</button>
                    <div className="dropdown js-dropdown-auto-focus-input">
                        <div className="dropdown__search d-flex">
                            <div className="filter-bar flex-grow">
                                <div className="filter-bar__item flex-grow">
                                    <div className="search-input">
                                        <input type="text" class="search-input__input input--small" onChange={this.handleSearch} placeholder={EE.relationship.lang.search} />
                                    </div>
                                </div>
                                <div className="filter-bar__item">
                                    <DropDownButton
                                        keepSelectedState={true}
                                        title={EE.relationship.lang.channel}
                                        items={channelFilterItems}
                                        onSelect={(value) => this.channelFilterChange(value)}
                                        buttonClass="filter-bar__button"
                                    />
                                </div>
                                {this.props.can_add_items &&
                                <div className="filter-bar__item">
                                    {props.channels.length == 1 &&
                                    <button type="button" className="button button--primary button--small" onClick={() => this.openPublishFormForChannel(this.props.channels[0])}>New Entry</button>
                                    }
                                    {props.channels.length > 1 &&
                                    <div>
                                    <button type="button" className="js-dropdown-toggle button button--primary button--small">New Entry <i class="fas fa-caret-down icon-right"></i></button>
                                    <div className="dropdown">
                                        {props.channels.map((channel) => {
                                            return (
                                                <a href className="dropdown__link" onClick={() => this.openPublishFormForChannel(channel)}>{channel.title}</a>
                                            )
                                        })}
                                    </div>
                                    </div>
                                    }
                                </div>
                                }
                            </div>
                        </div>

                        <div className="dropdown__scroll dropdown__scroll--small">
                        {
                            dropdownItems.map((item) => {
                                return (
                                    <a href="" onClick={(e) => { e.preventDefault(); this.selectItem(item)}} className="dropdown__link">{item.label} <span className="dropdown__link-right">{item.instructions}</span></a>
                                )
                            })
                        }
                        {dropdownItems.length == 0 &&
                            <div class="dropdown__header text-center">No Entries Found</div>
                        }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

$(document).ready(function () {
    Relationship.renderFields();
});

Grid.bind("relationship", "display", function (cell) {
    Relationship.renderFields(cell);
});

FluidField.on("relationship", "add", function (field) {
    Relationship.renderFields(field);
});
